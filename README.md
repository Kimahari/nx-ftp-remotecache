# nx-ftp-remote-cache

This is a basic library allowing nx cache to be stored in a distributed cache using ftp. 
## Usage Details

1) Navigate to a nx workspace.
2) Open nx.json
3) Configure the nx runner to 

```json
...
"tasksRunnerOptions": {
    "default": {
      "runner": "@kimahari/nx-ftp-remote-cache",
      "options": {
        "projectName": "infinite-scroll-container",
        "host": "localhost",
        "port": 8082,
        "user": "ftpUser",
        "password": "ftpPassword",
        "cacheableOperations": [
          "build",
          "test",
          "lint",
          "e2e"
        ]
      }
    }
  },
  ...
```

## Known issues 

1) Not tested with sftp only build for a basic local ftp cache server.

### Test graphite.dev - second changes - More More - More more - TTTTT
