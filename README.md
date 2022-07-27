The Polarity Annotation Manager is a CLI tool which will delete annotations in a specified channel that are past their "End Date of Information (DOI)". The tool can be used to clean up annotations that are no longer relevant.  The script uses the local time of the server it is run from to determine if the annotation is past it's End DOI.

Annotations which do not have an End DOI specified (which is the default), will not be deleted by the tool.

The tool outputs logging in newline delimited JSON.

It is recommended to run a database backup before executing the script.  You can do that with the following command:

```bash
sudo su - postgres -c /app/polarity-server/data/backups/db-backup.sh
```

The new backup file will be located in `/app/polarity-server-backups` and have the name `new-<timestamp>.sql.tgz`.
## Installation

You can install the tool using `git`. We recommend installing the tool directly onto your Polarity Server using the following commands:

```
cd /app
git clone https://github.com/polarityio/polarity-annotation-manager
cd polarity-annotation-manager
npm install
```

## Commands

```
./polarity-annotation-manager delete

Delete annotations in a specified channel that are past their end DOI

Options:
  --help                Show help  [boolean]
  --version             Show version number  [boolean]
  --username            Username to login as  [string]
  --password            Password for the given Polarity username  [string]
  --url                 Polarity server url to include schema  [string] [required]
  --config              Path to the server's config.js  [string] [required] [default: "/app/polarity-server/config/config.js"]
  --channel             The name of the channel to delete annotations from  [string] [required]
  --simulate            By default, the tool will log a preview of the actions it would take but no actions will be taken.  [boolean] [default: true]
  --rejectUnauthorized  If provided, the loader will reject unauthorized SSL connections  [boolean] [default: true]
  --progressBar         If provided, the manager will show a progress bar.  If not provided, progress will be logged.  Set to `false` for non-interactive usage.  [boolean] [default: true]
  --proxy               If provided, the connection to the Polarity server will use the provided proxy setting  [string] [default: ""]
  --logging             The logging level for the script.  [string] [choices: "error", "warn", "info", "debug"] [default: "info"]
```

## Test Deletion

To see how many annotations will be deleted run the following command:

```bash
./polarity-annotation-manager.sh --url <serverUrl> --username <username> --password <password> --channel <channelName>
```

The `<serverUrl>` should include the scheme (e.g., `https://my-polarity-server.com`).  The user account used to authenticate to Polarity must have admin privileges on the specified channel.

This command will not actually delete anything but instead simulates the deletion process so you can confirm that the configuration is valid.

If any of the argument values to the tool contain special characters you should enclose those values in single quotes:

```
./polarity-annotation-manager.sh --url <serverUrl> --username '<username>' --password '<password>' --channel '<channelName>'
```

## Using Environment Variables for Username & Password
You can also pass in the `username`, and `password` with environment variables.

```
POLARITY_USERNAME
POLARITY_PASSWORD
```

These can be passed in on the command line:

```bash
POLARITY_USERNAME=<username> POLARITY_PASSWORD=<password> ./polarity-annotation-manager.sh --url <serverUrl> --channel <channelName>
```

They can also be set via a `.env` file located at the root of the script:

```bash
# .env
POLARITY_USERNAME=username
POLARITY_PASSWORD=password
```

The `.env` file will be automatically read in by the tool which will use the provided `username` and `password`.  

## View Annotations to be Deleted

You can view exactly which annotations will be deleted by increasing the logging level to `debug` with the following command:

```bash
./polarity-annotation-manager.sh --url <serverUrl> --username <username> --password <password> --channel <channelName> --logging=debug
```

Note that when annotations are being deleted the associated entity name and tag name are not known.  As a result, only the annotation id will be logged.

## Delete Annotations

Once you're happy with your configuration disable the `simulate` mode to delete your annotations.

```bash
./polarity-annotation-manager.sh --url <serverUrl> --username <username> --password <password> --channel <channelName> --simulate=false
```


## Disable Progress Bar
By default the tool will display a progress bar once the deletion process starts. If you are running in non-interactive mode then you will want to disable this:

```bash
./polarity-annotation-manager.sh --url <serverUrl> --username <username> --password <password> --channel <channelName> --simulate=false --progressBar=false
```

