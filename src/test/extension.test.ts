import * as assert from "assert";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import {
  isUseClientDirective,
  findClientComponentUsages,
} from "../utils/rsc-detector";

// Helper function to create mock VS Code document
const createMockDocument = (
  content: string,
  filePath: string
): vscode.TextDocument => {
  const lines = content.split("\n");
  return {
    uri: vscode.Uri.file(filePath),
    fileName: filePath,
    getText: () => content,
    lineAt: (line: number) => ({
      text: lines[line] || "",
      lineNumber: line,
      range: new vscode.Range(
        new vscode.Position(line, 0),
        new vscode.Position(line, lines[line]?.length || 0)
      ),
      rangeIncludingLineBreak: new vscode.Range(
        new vscode.Position(line, 0),
        new vscode.Position(line, (lines[line]?.length || 0) + 1)
      ),
      firstNonWhitespaceCharacterIndex: lines[line]?.search(/\S/) ?? 0,
      isEmptyOrWhitespace: (lines[line] || "").trim().length === 0,
    }),
    lineCount: lines.length,
    positionAt: (offset: number) => {
      let currentOffset = 0;
      for (let i = 0; i < lines.length; i++) {
        if (currentOffset + lines[i].length >= offset) {
          return new vscode.Position(i, offset - currentOffset);
        }
        currentOffset += lines[i].length + 1; // +1 for newline
      }
      return new vscode.Position(
        lines.length - 1,
        lines[lines.length - 1]?.length || 0
      );
    },
    offsetAt: (position: vscode.Position) => {
      let offset = 0;
      for (let i = 0; i < position.line; i++) {
        offset += lines[i]?.length || 0 + 1; // +1 for newline
      }
      return offset + position.character;
    },
    version: 1,
    isDirty: false,
    isUntitled: false,
    languageId: "typescriptreact",
    encoding: "utf8",
    isClosed: false,
    eol: vscode.EndOfLine.LF,
    save: () => Promise.resolve(false),
    getWordRangeAtPosition: () => undefined,
    validateRange: (range: vscode.Range) => range,
    validatePosition: (position: vscode.Position) => position,
  } as unknown as vscode.TextDocument;
};

suite("RSC Detector Tests", () => {
  suite("isUseClientDirective", () => {
    test('should return true for file with "use client" directive', () => {
      const content = `'use client';

import React from 'react';

export default function Component() {
	return <div>Client Component</div>;
}`;
      assert.strictEqual(isUseClientDirective(content), true);
    });

    test('should return true for file with "use client" directive without semicolon', () => {
      const content = `'use client'

import React from 'react';

export default function Component() {
	return <div>Client Component</div>;
}`;
      assert.strictEqual(isUseClientDirective(content), true);
    });

    test('should return false for file without "use client" directive', () => {
      const content = `import React from 'react';

export default function Component() {
	return <div>Server Component</div>;
}`;
      assert.strictEqual(isUseClientDirective(content), false);
    });

    test('should return false for file with "use server" directive', () => {
      const content = `'use server';

import { db } from './lib/db';

export async function getData() {
	return db.query('SELECT * FROM users');
}`;
      assert.strictEqual(isUseClientDirective(content), false);
    });

    test("should return false for invalid JavaScript code", () => {
      const content = `invalid javascript syntax!!!`;
      assert.strictEqual(isUseClientDirective(content), false);
    });

    test('should return true when "use client" is preceded by comments', () => {
      const content = `// This is a client component
/* Multi-line comment */
'use client';

import React from 'react';

export default function Component() {
	return <div>Client Component</div>;
}`;
      assert.strictEqual(isUseClientDirective(content), true);
    });
  });

  suite("findClientComponentUsages", () => {
    let tempDir: string;
    let clientComponentPath: string;
    let serverComponentPath: string;

    suiteSetup(() => {
      // Create temporary directory for test files
      tempDir = fs.mkdtempSync(path.join(__dirname, "../../../temp-test-"));
      clientComponentPath = path.join(tempDir, "ClientComponent.tsx");
      serverComponentPath = path.join(tempDir, "ServerComponent.tsx");
    });

    suiteTeardown(() => {
      // Clean up temporary files
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    setup(() => {
      // Create client component file
      fs.writeFileSync(
        clientComponentPath,
        `'use client';

import React from 'react';

export default function ClientComponent() {
	return <div>Client Component</div>;
}`
      );

      // Create server component file
      fs.writeFileSync(
        serverComponentPath,
        `import React from 'react';

export default function ServerComponent() {
	return <div>Server Component</div>;
}`
      );
    });

    test('should return empty array for file with "use client" directive', () => {
      const content = `'use client';

import ClientComponent from './ClientComponent';

export default function Page() {
	return <ClientComponent />;
}`;

      const document = createMockDocument(
        content,
        path.join(tempDir, "page.tsx")
      );
      const ranges = findClientComponentUsages(document);
      assert.strictEqual(ranges.length, 0);
    });

    test("should find client component usage on single line", () => {
      const content = `import ClientComponent from './ClientComponent';

export default function Page() {
	return <ClientComponent />;
}`;

      const document = createMockDocument(
        content,
        path.join(tempDir, "page.tsx")
      );
      const ranges = findClientComponentUsages(document);
      assert.strictEqual(ranges.length, 1);
      assert.strictEqual(ranges[0].start.line, 3);
      assert.strictEqual(ranges[0].start.character, 27);
    });

    test("should find client component usage on multiple lines", () => {
      const content = `import ClientComponent from './ClientComponent';

export default function Page() {
	return (
		<ClientComponent>
			<div>Content</div>
		</ClientComponent>
	);
}`;

      const document = createMockDocument(
        content,
        path.join(tempDir, "page.tsx")
      );
      const ranges = findClientComponentUsages(document);
      assert.strictEqual(ranges.length, 1);
      assert.strictEqual(ranges[0].start.line, 4);
      assert.strictEqual(ranges[0].start.character, 19);
    });

    test("should find multiple client component usages", () => {
      const content = `import ClientComponent from './ClientComponent';

export default function Page() {
	return (
		<div>
			<ClientComponent />
			<ClientComponent />
		</div>
	);
}`;

      const document = createMockDocument(
        content,
        path.join(tempDir, "page.tsx")
      );
      const ranges = findClientComponentUsages(document);
      assert.strictEqual(ranges.length, 2);
    });

    test("should return empty array when no client components are imported", () => {
      const content = `import ServerComponent from './ServerComponent';

export default function Page() {
	return <ServerComponent />;
}`;

      const document = createMockDocument(
        content,
        path.join(tempDir, "page.tsx")
      );
      const ranges = findClientComponentUsages(document);
      assert.strictEqual(ranges.length, 0);
    });

    test("should handle self-closing tags", () => {
      const content = `import ClientComponent from './ClientComponent';

export default function Page() {
	return <ClientComponent />;
}`;

      const document = createMockDocument(
        content,
        path.join(tempDir, "page.tsx")
      );
      const ranges = findClientComponentUsages(document);
      assert.strictEqual(ranges.length, 1);
      assert.strictEqual(ranges[0].start.line, 3);
      assert.strictEqual(ranges[0].start.character, 27);
    });
  });

  suite("Extension Activation", () => {
    test("should import activate function without errors", () => {
      // Simply test that the activate function can be imported
      const { activate } = require("../extension");
      assert.strictEqual(
        typeof activate,
        "function",
        "activate should be a function"
      );
    });

    test("should import deactivate function without errors", () => {
      // Simply test that the deactivate function can be imported
      const { deactivate } = require("../extension");
      assert.strictEqual(
        typeof deactivate,
        "function",
        "deactivate should be a function"
      );
    });
  });
});
