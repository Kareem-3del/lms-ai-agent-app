# LMS Center

A desktop application that connects to your Learning Management System (LMS) and provides desktop notifications for new assignments.

## Features

### Current Features
- **Multi-LMS Support**: Works with Canvas and Moodle (Blackboard coming soon)
- **Desktop Notifications**: Get notified when new assignments are added
- **Sound Alerts**: Optional sound notifications for new assignments
- **Background Monitoring**: Runs in system tray and checks periodically
- **Secure Storage**: Encrypted credential storage
- **Assignment Dashboard**: View all upcoming assignments in one place
- **Auto Light/Dark Theme**: Follows system theme preferences

### Planned Features
- Credential-based login with automatic token refresh
- AI-powered assignment classification and summarization
- Auto-download and organize assignments by course
- Document editor with handwriting font conversion
- Phone photo effect filter for documents
- Upload and submission confirmation

## Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Build the application:
```bash
npm run build
```

3. Start the application:
```bash
npm start
```

## Configuration

### Getting Your LMS API Token

#### Canvas
1. Log in to your Canvas instance
2. Go to Account → Settings
3. Scroll to "Approved Integrations"
4. Click "+ New Access Token"
5. Enter a purpose (e.g., "LMS Center")
6. Click "Generate Token"
7. Copy the token immediately (you won't be able to see it again)

#### Moodle
1. Log in to your Moodle instance
2. Go to Preferences → User account → Security keys
3. Create a new web service token
4. Copy the token

### Setting Up the App

1. Launch LMS Center
2. Click the "Settings" button
3. Select your LMS type (Canvas or Moodle)
4. Enter your LMS URL (e.g., `https://canvas.instructure.com`)
5. Paste your API token
6. Set check interval (default: 15 minutes)
7. Enable/disable notification sound
8. Click "Save Settings"

## Usage

### System Tray
The app runs in the background in your system tray. Right-click the tray icon to:
- Show App
- Check Now (manually trigger assignment check)
- Quit

### Assignment View
The main window shows all your upcoming assignments with:
- Assignment name and course
- Due date with urgency indicators
- Color coding (red = urgent, yellow = soon, normal = later)

### Notifications
When new assignments are detected:
- A desktop notification appears
- Optional sound alert plays
- The assignment appears in your dashboard

## Development

### Project Structure
```
lms-center/
├── src/
│   ├── main.ts                 # Electron main process
│   ├── clients/                # LMS API clients
│   │   ├── lmsClient.ts
│   │   ├── canvasClient.ts
│   │   └── moodleClient.ts
│   ├── services/               # Business logic
│   │   ├── assignmentChecker.ts
│   │   └── settingsManager.ts
│   └── types/                  # TypeScript types
│       └── assignment.ts
├── renderer/                   # UI files
│   ├── index.html
│   ├── styles.css
│   └── renderer.js
├── dist/                       # Compiled TypeScript
└── package.json
```

### Scripts
- `npm run build` - Compile TypeScript
- `npm run watch` - Watch mode for development
- `npm start` - Run the app
- `npm run dev` - Build and run

## Troubleshooting

### "Failed to connect to LMS"
- Verify your LMS URL is correct
- Check that your API token is valid
- Ensure you have internet connection
- Try generating a new API token

### No notifications appearing
- Check that notifications are enabled in your system settings
- Verify the check interval has passed
- Try clicking "Check Now" in the tray menu

### App not starting
- Delete `node_modules` and run `npm install` again
- Check Node.js version is 18+
- Look for errors in the console

## Security

- API tokens are encrypted using electron-store
- Credentials are stored locally on your machine
- No data is sent to third parties
- All LMS communication uses HTTPS

## Developer

**Kareem Adel Mohammed Zayed**
- Computer Engineering
- GitHub: [@Kareem-3del](https://github.com/Kareem-3del)

## License

MIT
