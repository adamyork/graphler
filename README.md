# graphler

## Why
You want to quickly graph simple, tabular data from a url. I am a visual person so I love to check for correlations this way.

## How
Simple 500~ line node.js process that parses a url for the desired data , renders it in a temporary local url, and launches it in your default browser.

## Prequisites
- nodejs
- git
To run from source simply..

- clone
- npm install
- run a command

## The command
````
graphler.js <url> <data column name> <graph type>

graph the data

Positionals:
  url               URL to fetch content from                           [string]
  data column name  if selecting data from a table, this is the column title
                    that contains the data cells. else this an abitrary string
                    for graph title.                                    [string]
  graph type        supported types are line,bar,pie, and radar
                                                      [string] [default: "line"]

Options:
  --version      Show version number                                   [boolean]
  --format, -f   a regex used for searching the data column cells for values
                                                                        [string]
  --index, -i    only used if a format is specified that results in more than
                 one match                                              [string]
  --verbose, -v  enable verbose logging                                [boolean]
  --limit, -l    truncate the results to graph                          [number]
  --help, -h     Show help                                             [boolean]
````

## Examples

### Simple use cases

#### Paranormal Televsion series by network in bar chart form
````
node graphler.js "https://en.wikipedia.org/wiki/Paranormal_television" "original channel" bar -t "Televsion series by network"
````
#### Paranormal Televsion series starts by year
````
node graphler.js "https://en.wikipedia.org/wiki/Paranormal_television" "original run" line
````
### Advanced use cases

#### Paranormal Televsion series starts by year with format
````
node graphler.js "https://en.wikipedia.org/wiki/Paranormal_television" "original run" line -f "[0-9]+"
````
### Marvel Utlimate characters by starting letter of name from a list with format
````
node graphler.js "https://en.wikipedia.org/wiki/List_of_Ultimate_Marvel_characters" "Abomination" "bar" -f "[A-Za-z]"
````
#### Paranormal Televsion series ends by year with format and index
````
node graphler.js "https://en.wikipedia.org/wiki/Paranormal_television" "original run" line -f "[0-9]+" -i 1 
````
#### All south park episodes by month across multiple tables in the same page with format
````
node graphler.js "https://en.wikipedia.org/wiki/List_of_South_Park_episodes" ["original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date"] line -f "[A-Za-z]+"
````

### Local data use case; pre-formatted json file from file system
in the following format: 
```json
{
    "objectList": [{
        "text": "someValue"
    }]
}
```
````
node graphler.js "C:\Users\User\Desktop\someFile.json" "objectList" -t "a graph title" line
````

### Hey I want to save my graphs !
Understandable. They are stored in the generated folder local to the project.

## Limitations
- No support for overlapping data , or series. 

- Works in a very anonymous way;treats dom elements generally. For example, there is currently no way to say grab data from the 6th , and only 6th table on a page, if the column identifier is shared with other tables. Furthermore, specific selectors like #id's and .class selectors are not supported.