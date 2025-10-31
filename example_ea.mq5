//+------------------------------------------------------------------+
//|                                                    example_ea.mq5 |
//|                        Copyright 2023, MetaQuotes Software Corp. |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2023, MetaQuotes Software Corp."
#property link      "https://www.mql5.com"
#property version   "1.00"
#property strict

#include <WinHttp.mqh>

// Input parameters
input string API_URL = "http://your-server-ip:5001/news"; // Replace with your API endpoint
input int POLL_INTERVAL = 300; // Poll every 5 minutes (300 seconds)

// Global variables
int lastPollTime = 0;
bool isStopTrading = false;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
    // Enable WebRequest for the API URL
    string cookie = NULL, headers;
    char post[], result[];
    int res = WebRequest("GET", API_URL, cookie, NULL, 5000, post, 0, result, headers);
    if (res == -1) {
        Print("WebRequest failed. Check URL permissions in MT5 options.");
        return INIT_FAILED;
    }
    Print("EA initialized successfully.");
    return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
    // Cleanup if needed
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
    // Check if it's time to poll the API
    if (TimeCurrent() - lastPollTime < POLL_INTERVAL) return;
    lastPollTime = TimeCurrent();

    // Poll the API
    string response = PollAPI();
    if (response == "") {
        Print("Failed to poll API.");
        return;
    }

    // Parse the response (simple JSON parsing)
    // Assuming response is like: {"status":"stoptrading"} or {"status":"normal"}
    if (StringFind(response, "\"status\":\"stoptrading\"") != -1) {
        isStopTrading = true;
        Print("Stop trading: High impact event detected.");
    } else {
        isStopTrading = false;
        Print("Normal trading.");
    }

    // If stop trading, skip this tick
    if (isStopTrading) return;

    // Your trading logic here
    // Example: Open a buy position if conditions met
    // if (/* your conditions */) {
    //     // Open buy order
    // }
}

//+------------------------------------------------------------------+
//| Poll the API and return response                                 |
//+------------------------------------------------------------------+
string PollAPI()
{
    string cookie = NULL, headers;
    char post[], result[];
    int timeout = 5000; // 5 seconds timeout

    int res = WebRequest("GET", API_URL, cookie, NULL, timeout, post, 0, result, headers);
    if (res == -1) {
        Print("WebRequest error: ", GetLastError());
        return "";
    }

    // Convert result to string
    string response = CharArrayToString(result);
    return response;
}
//+------------------------------------------------------------------+