// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as parser from "@babel/parser";
import traverse from "@babel/traverse";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const decorationType = vscode.window.createTextEditorDecorationType({
    after: {
      contentText: "Client Component",
      color: "rgba(153, 153, 153, 0.7)",
      margin: "0 0 0 1.5rem",
    },
  });

  let activeEditor = vscode.window.activeTextEditor;

  const updateDecorations = () => {
    if (!activeEditor) {
      return;
    }
    const ranges = findClientComponentUsages(activeEditor.document);
    activeEditor.setDecorations(decorationType, ranges);
  };

  vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      activeEditor = editor;
      if (editor) {
        updateDecorations();
      }
    },
    null,
    context.subscriptions
  );

  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (activeEditor && event.document === activeEditor.document) {
        updateDecorations();
      }
    },
    null,
    context.subscriptions
  );

  updateDecorations();
}

const findClientComponentUsages = (
  document: vscode.TextDocument
): vscode.Range[] => {
  const content = document.getText();

  const trimmedContent = content.trimStart();
  if (
    trimmedContent.startsWith('"use client"') ||
    trimmedContent.startsWith("'use client'")
  ) {
    return [];
  }

  const ast = parser.parse(document.getText(), {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  const clientComponentImports: { localName: string; source: string }[] = [];
  const usageRanges: vscode.Range[] = [];
  const currentDir = path.dirname(document.uri.fsPath);

  traverse(ast, {
    ImportDeclaration(nodePath) {
      const source = nodePath.node.source.value;

      const extensions = [".jsx", ".tsx"];
      const possiblePaths = extensions.flatMap((ext) => [
        path.resolve(currentDir, `${source}${ext}`),
        path.resolve(currentDir, `${source}/index${ext}`),
      ]);

      for (const filePath of possiblePaths) {
        if (fs.existsSync(filePath)) {
          try {
            const fileContent = fs.readFileSync(filePath, "utf-8");
            const trimmedFileContent = fileContent.trimStart();

            if (
              trimmedFileContent.startsWith('"use client"') ||
              trimmedFileContent.startsWith("'use client'")
            ) {
              nodePath.node.specifiers.forEach((specifier) => {
                if (
                  specifier.type === "ImportDefaultSpecifier" ||
                  specifier.type === "ImportSpecifier"
                ) {
                  clientComponentImports.push({
                    localName: specifier.local.name,
                    source,
                  });
                }
              });
              break;
            }
          } catch (error) {
            continue;
          }
        }
      }
    },
  });

  if (clientComponentImports.length === 0) {
    return [];
  }

  traverse(ast, {
    JSXElement(nodePath) {
      if (nodePath.node.openingElement.name.type === "JSXIdentifier") {
        const componentName = nodePath.node.openingElement.name.name;
        if (
          clientComponentImports.some((imp) => imp.localName === componentName)
        ) {
          if (nodePath.node.closingElement) {
            // Check if opening and closing tags are on the same line
            const openingTagEnd = nodePath.node.openingElement.loc!.end;
            const closingTagStart = nodePath.node.closingElement.loc!.start;

            const range = (() => {
              if (openingTagEnd.line !== closingTagStart.line) {
                // If tags are on different lines, place after opening tag
                return new vscode.Range(
                  new vscode.Position(
                    openingTagEnd.line - 1,
                    openingTagEnd.column
                  ),
                  new vscode.Position(
                    openingTagEnd.line - 1,
                    openingTagEnd.column
                  )
                );
              } else {
                // If tags are on the same line, place after closing tag
                const closingTagEnd = nodePath.node.closingElement.loc!.end;
                return new vscode.Range(
                  new vscode.Position(
                    closingTagEnd.line - 1,
                    closingTagEnd.column
                  ),
                  new vscode.Position(
                    closingTagEnd.line - 1,
                    closingTagEnd.column
                  )
                );
              }
            })();

            usageRanges.push(range);
          } else {
            // Self-closing tag case
            const openingTagEnd = nodePath.node.openingElement.loc!.end;
            const range = new vscode.Range(
              new vscode.Position(openingTagEnd.line - 1, openingTagEnd.column),
              new vscode.Position(openingTagEnd.line - 1, openingTagEnd.column)
            );
            usageRanges.push(range);
          }
        }
      }
    },
  });

  return usageRanges;
};

// This method is called when your extension is deactivated
export function deactivate() {}
