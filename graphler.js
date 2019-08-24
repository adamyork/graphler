/*!
 * graphler
 * Copyright(c) 2016-2019 Adam York
 * MIT Licensed
 */

'use strict';

const cheerio = require('cheerio');
const request = require('request');
const _ = require('underscore');
const safeOpen = require('open');
const chalk = require('chalk');
const fs = require('fs');
const yargs = require('yargs');

var verbose = false;
var limit = 0;
var formatResultIndex = 0;
var format = 'raw';
var graphTitle = 'graphler';

const G_LOG_PREFIX = chalk.magenta('Graphler');
const G_LOG_POSTFIX = chalk.magenta('Goodbye') + chalk.blue('!');

const argv = yargs
    .command('$0 <url> <data column name> <graph type>', 'graph the data', (yargs) => {
      yargs.positional('url', {
        describe: 'URL to fetch content from',
        type: 'string'
      })
      .positional('data column name', {
        describe: 'if selecting data from a table, this is the column title that contains the data cells.if selecting from a list it is the single value from one list element.',
        type: 'string'
      })
      .positional('graph type', {
        describe: 'supported types are line,bar,pie, and radar',
        type: 'string',
        default: 'line'
      })
    })
    .option('format', {
        alias: 'f',
        description: 'a regex used for searching the data column cells or list elements for values',
        type: 'string',
    })
    .option('index', {
        alias: 'i',
        description: 'only used if a format is specified that results in more than one match',
        type: 'string',
    })
    .option('verbose', {
        alias: 'v',
        description: 'enable verbose logging',
        type: 'boolean',
    })
    .option('limit', {
        alias: 'l',
        description: 'truncate the results to graph',
        type: 'number',
    })
    .option('title', {
        alias: 't',
        description: 'a graph title',
        type: 'string',
    })
    .help()
    .alias('help', 'h')
    .argv;

const url = argv.url;
const dataColumnName = argv.datacolumnname;
const graphType = argv.graphtype;

if (argv.verbose) {
    verbose = true;
}

if (argv.limit) {
    limit = argv.limit;
}

if (argv.format) {
    format = argv.format;
}

if (argv.index) {
    formatResultIndex = argv.index;
}

if (argv.title) {
    graphTitle = argv.title;
}

function log() {
    var str = '';
    _.each(arguments, (argument, i) => {
        if (i === 0) {
            argument = chalk.green(argument);
        } else {
            argument = chalk.white(argument);
        }
        str += ' ' + argument;
    });
    console.log(str);
}

function logErrorAndExit() {
    var str = '';
    _.each(arguments, (argument, i) => {
        if (i === 0) {
            argument = chalk.red(argument);
        } else {
            argument = chalk.white(argument);
        }
        str += ' ' + argument;
    });
    console.log(str);
    process.exit(1);
}

function build(chunks){
    let $ = cheerio.load(chunks);
    let domString = chunks.toLowerCase();
    var normalizedColumnLabel = dataColumnName.toLowerCase();
    var indexOfColumnString;
    if (normalizedColumnLabel.indexOf('[') === 0) {
        normalizedColumnLabel = normalizedColumnLabel.slice(1, normalizedColumnLabel.length - 1).split(',');
        indexOfColumnString = domString.indexOf(normalizedColumnLabel[0]);
    } else {
        indexOfColumnString = domString.indexOf(normalizedColumnLabel);
    }
    if(indexOfColumnString === -1){
        logErrorAndExit('Column Not Found.');
    }
    let fromColumnStringIndexToEof = domString.substring(indexOfColumnString,domString.length);
    let chars = fromColumnStringIndexToEof.split('');
    let columnTagType = getColumnTagType(chars);
    let dataset = getDataSet(normalizedColumnLabel,columnTagType,$);
    renderAndPublish(dataset);
}

function getColumnTagType(chars){
    var str = '';
    var tagType = '';
    for(var i=0; i < chars.length; i++){
        str += chars[i];
        if(str.indexOf('</th>') !== -1){
            tagType = 'th';
            break;
        }
        if(str.indexOf('</td>') !== -1){
            tagType = 'td';
            break;
        }
        if(str.indexOf('</ul>') !== -1){
            tagType = 'ul';
            break;
        }
        if(str.indexOf('</ol>') !== -1){
            tagType = 'ol';
            break;
        }
    }
    if(tagType === ''){
        logErrorAndExit('Unknown tag type for column.');
    }
    if(verbose){
        log('Column type is ' + tagType);
    }
    return tagType;
}

function getDataSet(columnName,columnTagType,$){
    var dataset;
    switch (columnTagType) {
        case 'td':
        case 'th':
            dataset = getDatasetFor(columnName, 'quantity', columnTagType, $('table'), $);
            break;
        case 'ul':
            dataset = getDatasetForList(columnName, 'quantity', $('ul'), $);
            break
        case 'ol':
            dataset = getDatasetForList(columnName, 'quantity', $('ol'), $);
            break;
        default:
            break;
    }
    return dataset;
}

function getDatasetFor(data, label, columnTagType, tables, $, count, memo, matched) { //jshint ignore:line
    var current;
    var found;
    var index;
    if (typeof data === 'object') {
        if (!count) {
            count = 0;
            memo = [];
            matched = [];
        }
        current = data[count];
    } else {
        current = data;
    }
    var again = true;
    if (verbose) {
        log('found ' + tables.length + ' tables');
    }
    tables.each(function(i, table) {
        let headers = $(table).find(columnTagType);
        if (verbose) {
            log('found ' + headers.length + ' headers in table ' + i);
        }
        headers.each(function(j, header) {
            let text = $(header).text().toLowerCase();
            if (verbose) {
                log('found text ' + text + ' in header ' + j);
            }
            if (count) {
                if (text.indexOf(current) !== -1 && !_.contains(matched, i)) {
                    found = table;
                    index = j;
                    matched.push(i);
                    again = false;
                    return again;
                }
            } else {
                if (text.indexOf(current) !== -1) {
                    found = table;
                    index = j;
                    again = false;
                    return again;
                }
            }
        });
        if (!again) {
            return false;
        }
    });
    if (!found) {
        logErrorAndExit('Table not found');
        return;
    }
    let target = $(found);
    var filtered = target.find('tr td:nth-child(' + (index + 1) + ')');
    if (limit === 1) {
        filtered = filtered.slice(0, 1);
    } else if (limit > 1) {
        filtered = filtered.slice(0, size);
    }
    if (verbose) {
        log('Found ' + filtered.length + ' cells in matching column ');
    }
    let transformed = filtered.map(function(i, cell) {
        let text = $(cell).text();
        var value;
        if(format !== 'raw'){
            let pattern = new RegExp(format,'g');
            let allMatches = [];
            var matchedText;
            while((matchedText = pattern.exec(text)) !== null){
                allMatches.push(matchedText[0]);
            }
            if(allMatches.length > 0){
                return {
                    'value': allMatches[formatResultIndex]
                };
            }
            return {
                    'value': allMatches[0]
            };
        }
        return {
            'value': text
        };
    }).get();
    count++;
    if (!memo) {
        return transformed;
    }
    memo.push(transformed);
    if (count === data.length) {
        return _.flatten(memo);
    } else {
        return getDatasetFor(data, label, columnTagType, tables, $, count, memo, matched);
    }
}

function getDatasetForList(data, label, tables, $) {
    let found = [];
    if (verbose) {
        log('Found ' + tables.length + ' lists');
    }
    tables.each((i, table) => {
        let headers = $(table).find('li');
        headers.each((j, header) => {
            let text = $(header).text().toLowerCase();
            let obj = transform(text);
            found.push(obj);
        });
    });
    return found;
}

function transform(text){
    var obj;
    if(format !== 'raw'){
        let pattern = new RegExp(format,'g');
        let allMatches = [];
        var matchedText;
        while((matchedText = pattern.exec(text)) !== null){
            allMatches.push(matchedText[0]);
        }
        if(allMatches.length > 0){
            obj = {
                'value': allMatches[formatResultIndex]
            };
        }
        obj = {
                'value': allMatches[0]
        };
    } else {
        obj = {
            'value': text
        };
    }
    return obj;
}

function renderAndPublish(dataset){
    let templateFile = 'graphler-template.html';
    let groups = _.groupBy(dataset, (data) => {
        return data.value;
    });
    let values = _.map(groups, (group) => {
        return group[0].value;
    });
    let counts = _.map(groups, (group) => {
        return group.length;
    });
    log('Rendering page graphs...');
    fs.readFile(templateFile, (err, data) => {
        if (err) {
            logErrorAndExit('Cant read template file.' + err);
        }
        log('Generating file...');
        publish(data, values, counts);
    });
}

function processLocalFile(){
    fs.readFile(url, 'utf8', function(err, data) {
        if (err) {
            logErrorAndExit('Cant read local data file.' +err);
        }
        let parsed = JSON.parse(data);
        let elements = parsed[dataColumnName];
        var transformed = elements.map((element) => {
            return transform(element.text);
        });
        let templateFile = 'graphler-template.html';
        let groups = _.groupBy(transformed, (data) => {
            return data.value;
        });
        let values = _.map(groups, (group) => {
            return group[0].value;
        });
        let counts = _.map(groups, (group) => {
            return group.length;
        });
        log('Rendering page graphs...');
        fs.readFile(templateFile, (err, data) => {
            if (err) {
                logErrorAndExit('Cant read templatefile.' + err);
            }
            log('Generating File...');
            publish(data, values, counts, dataColumnName.toLowerCase());
        });
    });
}

function publish(data, values, counts) {
    var html = data.toString();
    html = html.replace('titleToken', '"' + graphTitle + '"');
    html = html.replace('chartTypeToken', '"' + graphType + '"');
    html = html.replace('labelsToken', JSON.stringify(values));
    html = html.replace('dataToken', '[' + counts + ']');
    if (graphType === 'bar' || graphType === 'pie') {
        html = html.replace('colorsToken', JSON.stringify(getColors(values)));
    } else {
        html = html.replace('colorsToken', '"' + generateHex() + '"');
    }
    let filename = graphTitle.replace(' ','') + (Math.random() * 10 / Math.random() * 10);
    if (!fs.existsSync('generated')) {
        fs.mkdir('generated', { recursive: true }, (err) => {
            if (err) throw err;
            writeFile(html,filename);
        });
    } else {
        writeFile(html,filename);
    }
}

function writeFile(html,filename){
    fs.writeFile('generated/'+ filename + '.html', html, (err) => {
        if (err) throw err;
        var promise = (async()=>{
            log('File ' + filename + ' create in ' + __dirname + '\\generated\\');
            await safeOpen('file://' + __dirname + '/generated/'+ filename +'.html');
        })();
        promise.then(()=>{
             log('Cleaning up...');
             log(G_LOG_POSTFIX);
        });
    });
}

function getColors(values) {
    let colors = [];
    _.each(values, function() {
        colors.push(generateHex());
    });
    return colors;
}

function generateHex(previous) {
    let hex = '#' + Math.floor(Math.random() * 16777215).toString(16);
    if (hex !== previous) {
        return hex;
    } else {
        return generateHex(hex);
    }
}

if (url.indexOf('.json') !== -1) {
    log(G_LOG_PREFIX);
    log('Loading local data', url + '...');
    processLocalFile();
} else {
    log(G_LOG_PREFIX);
    log('Fetching data for', url + '...');
    request
        .get(url)
        .on('response', function(response) {
            var chunks;
            response.on('data', function(chunk) {
                chunks += chunk;
            });
            response.on('end', function() {
                log('Fetched data from ', url + ' for column ' + dataColumnName + '...');
                build(chunks, false);
            });
        });
}