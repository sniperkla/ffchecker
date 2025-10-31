# Forex News Checker for MT5

This project provides an API to check Forex news events and control trading in MT5 based on news impact.

## API Endpoints

- `/ff-news`: Returns today's USD Forex events with unix timestamps.
- `/checknews`: Returns trading status (`"stoptrading"` or `"normal"`) based on upcoming events.

## MT5 Integration

### 1. Enable Web Requests in MT5
1. Open MT5 and go to **Tools > Options > Expert Advisors**.
2. Check:
   - **Allow automated trading**
   - **Allow DLL imports**
3. In **"Allow WebRequest for listed URL"**, add your API server URL (e.g., `http://your-server-ip:3001`).
4. Click **OK** and restart MT5.

### 2. Install the EA
1. Copy the provided MQL5 EA code into a new file in MetaEditor (e.g., `NewsChecker.mq5`).
2. Compile the EA.
3. Attach it to a chart in MT5.

### 3. Configure the EA
- **api_url**: Set to your API URL (e.g., `http://localhost:3001/checknews`).
- **poll_interval**: Polling interval in milliseconds (default: 10000 = 10 seconds).

### 4. How It Works
- The EA polls the `/checknews` API periodically.
- If `status` is `"stoptrading"`, it stops trading (closes positions, disables new trades).
- If `status` is `"normal"`, it resumes trading.
- Use `stoptime` for precise timing if needed.

### 5. Sample EA Code
```mql5
// ... (insert the sample code from previous response)
```

### 6. Testing
- Run the EA in a demo account.
- Monitor logs for API responses and status changes.
- Ensure the API server is running and accessible.

### 7. Troubleshooting
- **WebRequest fails**: Check URL permissions and firewall.
- **API not responding**: Verify server IP/port and network.
- **Status not updating**: Check poll interval and API caching (60 seconds).

## Server Setup
- Run `node index.js` to start the API server.
- Ensure MongoDB is connected and populated with Forex events.

## Notes
- API responses are cached for 60 seconds to handle multiple clients.
- For production, consider HTTPS and authentication.
- Contact support for advanced integrations.