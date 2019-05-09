{
  "apps" : [{
    "name"        : "app",
    "script"      : "app.js",
    "env": {
      "DISPLAY": ":99"
    }
  },
    {
      "name"        : "Xvfb",
      "interpreter" : "none",
      "script"      : "Xvfb",
      "args"        : ":99"
    }]
}