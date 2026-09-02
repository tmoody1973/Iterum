# Iterum Web Clipper

This Manifest V3 extension sends a webpage or image to Iterum with its original source URL. The app validates the handoff, creates an uncertain-rights proposal in **Agent Additions**, and keeps it in the Review Tray until the designer approves or rejects it.

## Load the local demo

1. Run Iterum at `http://127.0.0.1:3333/`.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select this `extension` folder.

Use the toolbar action to clip a page, or right-click a page/image and choose **Save … to Iterum**.

The extension requests only `activeTab` and `contextMenus`; it does not read browsing history or send clips anywhere except the locally configured Iterum URL.
