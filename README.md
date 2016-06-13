#graphler

##Why

You want to quickly graph simple, tabular data from a url. I am a visual person so I love to check for correlations this way.

##How

Simple 150 line node.js process that parses a url for the desired data , renders it in a temporary local url, and launches it in your default browser.

##Prequisites

- nodejs
- git

To run from source simply..

- clone
- npm install
- run a command

##The command

````
node graphler-bar.js "<url>" "<column identifier(s)>" "<graph title>" "<column value normalizer>" "<column value normalizer arg>"
````

- url - fully qualified url of page with table(s).
- column identifier - the header string of the column(s) in the table(s) containing the values you want to graph.
- column value normalizer - OPTIONAL...kinda - the inner body of a transform function you would like applied to each value. While it is optional, most column value actually contain a variety of data points, that don't make sense to plot collectively. A simple split is usually sufficient to isolate the value you want to see.
- column value normalizer arg- OPTIONAL...if you omitted the normalizer - this is the arg passed into your normilzer function

##Examples

###Paranormal Televsion series starts by year
````
node graphler-bar.js "https://en.wikipedia.org/wiki/Paranormal_television" "original run" "shows per year" "var pattern = '[' + String.fromCharCode(8211) + '\\'+String.fromCharCode(45) + String.fromCharCode(115) + ']+'; var regex = new RegExp(pattern); var split = str.split(regex); if (split.length > 1) {return split[0]; } else {return str; }" "str"
````
###Paranormal Televsion series by network
````
node graphler-bar.js "https://en.wikipedia.org/wiki/Paranormal_television" "original channel" "shows per year" "var split = str.split(','); if (split.length > 1) {return split[0]; } else {return str; }" "str"
```
###Paranormal Televsion series ends by year
````
node graphler-bar.js "https://en.wikipedia.org/wiki/Paranormal_television" "original run" "shows per year" "var pattern = '[' + String.fromCharCode(8211) + '\\'+String.fromCharCode(45) + String.fromCharCode(115) + ',\\s]+'; var regex = new RegExp(pattern); var split = str.split(regex); if (split.length > 1) {return split[1].toLowerCase(); } else {return str.toLowerCase(); }" "str"
````
###All south park episodes by month
````
node graphler-bar.js "https://en.wikipedia.org/wiki/List_of_South_Park_episodes" ["original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date"] "shows per month" "return str.split(/\s/)[0].trim();" "str"
````
###All nvidia graphics cards release dates by month
````
node graphler-bar.js "https://en.wikipedia.org/wiki/List_of_Nvidia_graphics_processing_units" ["launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch"] "months cards were released" "return str.split(/\s/)[0].trim();" "str"
````

###Hey I want to save my graphs !

Understandable. From you browser simply select 'save page as'. Everything the graph needs to render is entirely self contained within the data uri.

##Limitations

- Currently this script is basic and I aim to preserve its simplicity. git

- Only support bar graphs. I will probably add different scripts later for pie charts and things. PIE !

- Looks for column indentifiers in `<th>` elements. If your identifier lies in a `<td>` , its likely to not be found.

- No support for overlapping data , or series. 

- Works in a very anonymous way, treats dom elements generally. For example, there is currently no way to say grab data from the 6th , and only 6th table on a page, if the column identifier is shared with other tables. Furthermore, specific selectors like #id's and .class selectors are not supported.