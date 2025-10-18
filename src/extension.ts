// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { findClientComponentUsages } from "./utils/rsc-detector";

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

// This method is called when your extension is deactivated
export function deactivate() {}
