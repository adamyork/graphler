/*!
 * whamda
 * Copyright(c) 2016 Adam York
 * MIT Licensed
 */

'use strict';

var cheerio = require('cheerio');
var request = require('request');
var express = require('express');
var _ = require('underscore-node');
var fs = require('fs');
var safeOpen = require('open');
var chalk = require('chalk');

var url = process.argv[2];
var gdata = process.argv[3];
var eltype = process.argv[4];
var glabel = process.argv[5];
var gtype = process.argv[6];
var transformF = process.argv[7];
var transformArg = process.argv[8];

var WBG_LOG_PREFIX = chalk.magenta('wiki-bar-graph');
var WBG_LOG_POSTFIX = chalk.magenta('goodbye') + chalk.blue('!');
var WBG_DELIMITER = chalk.grey('________________________________________________________________');

function log() {
    var str = '';
    _.each(arguments, function(argument, i) {
        if (i === 0) {
            argument = chalk.green(argument);
        } else {
            argument = chalk.white(argument);
        }
        str += ' ' + argument;
    });
    console.log(str);
}

function buildDataURI(chunks) {
    var $ = cheerio.load(chunks);
    var tables;
    var dataset;
    switch (eltype) {
        case 'td':
        case 'th':
            tables = $('table');
            dataset = getDatasetFor(gdata, glabel, tables, transformF, transformArg, $);
            break;
        case 'ul':
            tables = $('ul');
            dataset = getDatasetForList(gdata, glabel, tables, transformF, transformArg, $);
            break;
        case 'ol':
            tables = $('ol');
            dataset = getDatasetForList(gdata, glabel, tables, transformF, transformArg, $);
            break;
        default:
            break;
    }
    log('transforming column values with', transformF + '...');
    if (gdata.indexOf('[') === 0) {
        gdata = gdata.slice(1, gdata.length - 1).split(',');
    }
    var groups = _.groupBy(dataset, function(data) {
        return data.value;
    });
    var values = _.map(groups, function(group) {
        return group[0].value;
    });
    var counts = _.map(groups, function(group) {
        return group.length;
    });
    log('rendering page template...');
    fs.readFile('graph-template.html', function(err, data) {
        if (err) {
            throw err;
        }
        log('generating data uri...');
        sendDataURI(data, values, counts);
    });
}

function getDatasetFor(data, label, tables, transformF, transformArg, $, count, memo, matched) {
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
    tables.each(function(i, table) {
        var headers = $(table).find(eltype);
        headers.each(function(j, header) {
            var text = $(header).text().toLowerCase();
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
        console.log('table not found');
        return;
    }
    var target = $(found);
    var filtered = target.find('tr td:nth-child(' + (index + 1) + ')');
    var transformed = filtered.map(function(i, cell) {
        var text = $(cell).text();
        if (transformF) {
            var f = new Function(transformArg, transformF); //jshint ignore:line
            text = f(text);
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
        var flattened = _.flatten(memo);
        return flattened;
    } else {
        return getDatasetFor(data, label, tables, transformF, transformArg, $, count, memo, matched);
    }
}

function getDatasetForList(data, label, tables, transformF, transformArg, $) {
    var found = [];
    tables.each(function(i, table) {
        var headers = $(table).find('li');
        headers.each(function(j, header) {
            var text = $(header).text().toLowerCase();
            if (transformF) {
                var f = new Function(transformArg, transformF); //jshint ignore:line
                text = f(text);
            }
            var obj = {
                'value': text
            };
            found.push(obj);
        });
    });
    return found;
}

function sendDataURI(data, values, counts) {
    var html = data.toString();
    html = html.replace('titleToken', '"' + glabel + '"');
    html = html.replace('chartTypeToken', '"' + gtype + '"');
    html = html.replace('labelsToken', JSON.stringify(values));
    html = html.replace('dataToken', '[' + counts + ']');
    if (gtype === 'bar' || gtype === 'pie') {
        html = html.replace('colorsToken', JSON.stringify(getColors(values)));
    } else {
        html = html.replace('colorsToken', '"' + generateHex() + '"');
    }
    var buf = new Buffer(html, 'UTF-8');
    var dataURI = 'data:text/html;base64,' + buf.toString('base64');
    var app = express();
    app.use(express.static('static'));
    app.get('/data', function(req, res) {
        log('launching data uri...');
        log('cleaning up...');
        setTimeout(function() {
            log('shutting down. thank you for using wiki-bar-graph.');
            log(WBG_LOG_POSTFIX);
            server.close();
            process.exit(0);
        }, 1000);
        res.send(dataURI);
    });
    var server = app.listen(function() {
        var port = server.address().port;
        safeOpen('http://localhost:' + port + '?port=' + port);
    });
}

function getColors(values) {
    var colors = [];
    _.each(values, function() {
        colors.push(generateHex());
    });
    return colors;
}

function generateHex(previous) {
    var hex = '#' + Math.floor(Math.random() * 16777215).toString(16);
    if (hex !== previous) {
        return hex;
    } else {
        return generateHex(hex);
    }
}

log(WBG_LOG_PREFIX);
log('getting data for', url + '...');

request
    .get(url)
    .on('response', function(response) {
        var chunks;
        response.on('data', function(chunk) {
            chunks += chunk;
        });
        response.on('end', function() {
            log('building the data uri', glabel + ' from column ' + gdata + '...');
            buildDataURI(chunks);
        });
    });