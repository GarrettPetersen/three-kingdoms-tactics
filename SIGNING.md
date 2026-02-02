# Code Signing for macOS

## Getting a Developer ID Certificate

For distributing macOS apps outside the App Store (like Steam), you need a **Developer ID Application** certificate.

### Option 1: Via Xcode (Easiest)

1. Open Xcode
2. Go to **Xcode → Settings → Accounts**
3. Sign in with your Apple Developer account
4. Select your team
5. Click **Manage Certificates...**
6. Click the **+** button
7. Select **Developer ID Application**
8. Click **Done**

The certificate will be automatically installed in your Keychain.

### Option 2: Via Apple Developer Portal

1. Go to https://developer.apple.com/account
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **+** to create a new certificate
4. Select **Developer ID Application**
5. Follow the instructions to create a Certificate Signing Request (CSR)
6. Download and install the certificate

## Verifying Your Certificate

Run this command to see your Developer ID certificate:

```bash
security find-identity -v -p codesigning | grep "Developer ID"
```

You should see something like:
```
1) ABC123DEF456... "Developer ID Application: Your Name (TEAM_ID)"
```

## Building with Code Signing

Once you have the certificate installed, simply run:

```bash
npm run dist
```

electron-builder will automatically:
- Find your Developer ID certificate
- Sign the app and all helper executables
- Apply hardened runtime entitlements

## Notarization (Optional but Recommended)

For macOS Gatekeeper to fully trust your app, you should also notarize it. This requires:

1. An App Store Connect API key (or Apple ID credentials)
2. Add to `package.json`:

```json
"mac": {
  "notarize": {
    "teamId": "YOUR_TEAM_ID"
  }
}
```

Or set environment variables:
- `APPLE_ID` - Your Apple ID email
- `APPLE_APP_SPECIFIC_PASSWORD` - Generate at https://appleid.apple.com
- `APPLE_TEAM_ID` - Your team ID (found in Apple Developer portal)

Then build with:
```bash
npm run dist
```

Notarization happens automatically after signing.

## Troubleshooting

**"No valid identities found"**
- Make sure you have a Developer ID Application certificate (not Apple Development)
- Check it's installed: `security find-identity -v -p codesigning`

**"Code signing failed"**
- Make sure the certificate is valid and not expired
- Check Keychain Access app to verify the certificate

**"Gatekeeper still blocks the app"**
- You need to notarize the app (see above)
- Or users need to right-click → Open (first time only)

