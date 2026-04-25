const vscode = require('vscode');
const io = require('socket.io-client');

function activate(context) {
    console.log('CodeShield Bridge is active');

    // Connect to the local terminal backend (running on the same VM on port 8080)
    // We use localhost here because both the terminal backend and code-server run on the GCP VM.
    const socket = io('http://127.0.0.1:8080', {
        query: { sessionId: 'vscode-bridge' },
        reconnectionDelayMax: 10000,
    });

    socket.on('connect', () => {
        console.log('CodeShield Bridge connected to Terminal Backend');
    });

    // 1. Notify Backend when active file changes
    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            socket.emit('vscode-active-file', {
                path: editor.document.uri.fsPath,
                language: editor.document.languageId,
                content: editor.document.getText()
            });
        }
    });

    // 1.5 Notify Backend when content changes in real-time
    vscode.workspace.onDidChangeTextDocument(event => {
        const editor = vscode.window.activeTextEditor;
        if (editor && event.document === editor.document) {
            socket.emit('vscode-active-content', {
                path: editor.document.uri.fsPath,
                content: event.document.getText()
            });
        }
    });

    // 2. Notify Backend when cursor moves
    vscode.window.onDidChangeTextEditorSelection(e => {
        if (e.selections && e.selections.length > 0) {
            const position = e.selections[0].active;
            socket.emit('vscode-cursor', {
                line: position.line + 1,
                column: position.character + 1
            });
        }
    });

    // 3. Listen for Neural Fixes from Outer UI
    socket.on('vscode-apply-fix', async (data) => {
        const { filePath, content } = data;
        if (!filePath || !content) return;

        try {
            const uri = vscode.Uri.file(filePath);
            const document = await vscode.workspace.openTextDocument(uri);
            const editor = await vscode.window.showTextDocument(document);
            
            const fullRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(document.getText().length)
            );
            
            editor.edit(editBuilder => {
                editBuilder.replace(fullRange, content);
            });
            
            vscode.window.showInformationMessage("CodeShield: Neural Fix Applied!");
        } catch (e) {
            console.error("Failed to apply neural fix", e);
            vscode.window.showErrorMessage("CodeShield: Failed to apply fix.");
        }
    });
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
}
