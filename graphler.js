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
var verbose = process.argv[9];
var size = process.argv[10];

if (verbose) {
    verbose = !!verbose;
}

if (size) {
    size = parseInt(size);
}

var G_LOG_PREFIX = chalk.magenta('graphler');
var G_LOG_POSTFIX = chalk.magenta('goodbye') + chalk.blue('!');

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

function buildDataURI(chunks, concat) {
    var $ = cheerio.load(chunks);
    var tables;
    var dataset;
    if (gdata.indexOf('[') === 0) {
        gdata = gdata.slice(1, gdata.length - 1).split(',');
    }
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
    var templateFile;
    var values;
    var counts;
    if (gtype === 'timeline') {
        templateFile = 'graph-template-timeline.html';
        var labels = [];
        var dates = [];
        _.each(dataset, function(data) {
            if (data.value.start) {
                dates.push(data.value);
            } else {
                labels.push(data.value);
            }
        });
        console.log('labels.length', labels.length);
        console.log('dates.length', dates.length);
        values = _.map(labels, function(label, i) {
            return {
                'id': i,
                'content': label,
                'title': label,
                'start': dates[i].start,
                'end': dates[i].end
            };
        });
    } else {
        templateFile = 'graph-template.html';
        var groups = _.groupBy(dataset, function(data) {
            return data.value;
        });
        values = _.map(groups, function(group) {
            return group[0].value;
        });
        counts = _.map(groups, function(group) {
            return group.length;
        });
        if (concat) {
            return {
                values: values,
                counts: counts
            };
        }
    }
    log('rendering page template...');
    fs.readFile(templateFile, function(err, data) {
        if (err) {
            throw err;
        }
        log('generating data uri...');
        sendDataURI(data, values, counts);
    });
}

function getDatasetFor(data, label, tables, transformF, transformArg, $, count, memo, matched) { //jshint ignore:line
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
        var headers = $(table).find(eltype);
        if (verbose) {
            log('found ' + headers.length + ' headers in table ' + i);
        }
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
    if (size === 1) {
        filtered = filtered.slice(0, 1);
    } else if (size > 1) {
        filtered = filtered.slice(0, size);
    }
    if (gtype !== 'timeline') {
        filtered = filtered.filter(function(i, cell) {
            return $(cell).text().trim() !== '';
        });
    }
    var transformed = filtered.map(function(i, cell) {
        var text = $(cell).text();
        if (transformF) {
            if (verbose) {
                log('text before transform', text);
            }
            var f = new Function(transformArg, transformF); //jshint ignore:line
            text = f(text);
            if (verbose) {
                log('text after transform', text);
            }
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
            log('shutting down. thank you for using graphler.');
            log(G_LOG_POSTFIX);
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

if (url.indexOf('[') !== -1) {
    url = url.slice(1, url.length - 1);
    var urls = url.split(',');
    var allData = [];
    for (var i = 0; i < urls.length; i++) {
        request
            .get(url)
            .on('response', function(response) {
                var chunks;
                response.on('data', function(chunk) {
                    chunks += chunk;
                });
                response.on('end', function() {
                    log('building the data uri', glabel + ' from column ' + gdata + '...');
                    var set = buildDataURI(chunks, false);
                    allData.push(set);
                    if (allData.length === urls.length) {
                        // log('rendering page template...');
                        // fs.readFile('graph-template.html', function(err, data) {
                        //     if (err) {
                        //         throw err;
                        //     }
                        //     log('generating data uri...');
                        //     sendDataURI(data, values, counts);
                        // });
                        console.log('all done', allData);
                    }
                });
            });
    }
} else {
    log(G_LOG_PREFIX);
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
                buildDataURI(chunks, false);
            });
        });
}