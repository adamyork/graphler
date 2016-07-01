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
node graphler.js "<url>" "<el>" "<column identifier(s)>" "<graph title>" "<graph type>" "<column value normalizer>" "<column value normalizer arg>"
````

- url - fully qualified url of page with table(s).
- column identifier - OPTIONAL ... somtimes. In the case of an ordered or un-ordered list, the list elements will not contain an indentifier. In this case all elements will be graphed, so it is very dependent on the filter function.the header string of the column(s) in the table(s) containing the values you want to graph.
- el - the corresponding html element that contains the column identifier. valid types are `th`,`td`,`ol`, and `ul`.
- graph title - the title of the graph
- graph type - supported types are `line`,`bar`,`pie`, and `radar`
- column value normalizer - OPTIONAL...kinda - the inner body of a transform function you would like applied to each value. While it is optional, most column value actually contain a variety of data points, that don't make sense to plot collectively. A simple split is usually sufficient to isolate the value you want to see.
- column value normalizer arg- OPTIONAL...if you omitted the normalizer - this is the arg passed into your normilzer function
- verbose - OPTIONAL - true or false. default is false.

##Examples

###Paranormal Televsion series starts by year
win
````
node graphler.js "https://en.wikipedia.org/wiki/Paranormal_television" "original run" "th" "shows per year" "line" "var pattern = '[' + String.fromCharCode(8211) + '\\'+String.fromCharCode(45) + String.fromCharCode(115) + ']+'; var regex = new RegExp(pattern); var split = str.split(regex); if (split.length > 1) {return split[0]; } else {return str; }" "str"
````
mac
````
node graphler.js "https://en.wikipedia.org/wiki/Paranormal_television" "original run" "th" "shows per year" "line" "var pattern = '[' + String.fromCharCode(8211) + '\\\'+String.fromCharCode(45) + String.fromCharCode(115) + ']+'; var regex = new RegExp(pattern); var split = str.split(regex); if (split.length > 1) {return split[0]; } else {return str; }" "str"
````
###Paranormal Televsion series by network
````
node graphler.js "https://en.wikipedia.org/wiki/Paranormal_television" "original channel" "th" "shows per year" "bar" "var split = str.split(','); if (split.length > 1) {return split[0]; } else {return str; }" "str"
```
###Paranormal Televsion series ends by year
win
````
node graphler.js "https://en.wikipedia.org/wiki/Paranormal_television" "original run" "th" "shows per year" "pie" "var pattern = '[' + String.fromCharCode(8211) + '\\'+String.fromCharCode(45) + String.fromCharCode(115) + ',\\s]+'; var regex = new RegExp(pattern); var split = str.split(regex); if (split.length > 1) {return split[1].toLowerCase(); } else {return str.toLowerCase(); }" "str"
````
mac
````
node graphler.js "https://en.wikipedia.org/wiki/Paranormal_television" "original run" "th" "shows per year" "pie" "var pattern = '[' + String.fromCharCode(8211) + '\\\'+String.fromCharCode(45) + String.fromCharCode(115) + ',\\s]+'; var regex = new RegExp(pattern); var split = str.split(regex); if (split.length > 1) {return split[1].toLowerCase(); } else {return str.toLowerCase(); }" "str"
````
###All south park episodes by month
````
node graphler.js "https://en.wikipedia.org/wiki/List_of_South_Park_episodes" ["original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date","original air date"] "th" "shows per month" "bar" "return str.split(/\s/)[0].trim();" "str"
````
###All nvidia graphics cards release dates by month
````
node graphler.js "https://en.wikipedia.org/wiki/List_of_Nvidia_graphics_processing_units" ["launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch","launch"] "th" "months cards were released" "radar" "return str.split(/\s/)[0].trim();" "str"
````

###Marvel Utlimate characters by starting letter of name
````
node graphler.js "https://en.wikipedia.org/wiki/List_of_Ultimate_Marvel_characters" "" "ul" "characters by starting letter of name" "bar" "return str[0];" "str"
````
###Zombie Movies By Year
````
node graphler.js "https://en.wikipedia.org/wiki/List_of_zombie_films" "year" "th" "movies per year" "line" "" ""
````
###Flat Filter of Zombie Movies By Title Containing of the dead.
````
node graphler.js "https://en.wikipedia.org/wiki/List_of_zombie_films" "title" "th" "movies per year" "line" "str = str.toLowerCase();var index = str.indexOf('of the dead');if(index !== -1){return str;}return ''" "str"
````

###Hey I want to save my graphs !

Understandable. From you browser simply select 'save page as'. Everything the graph needs to render is entirely self contained within the data uri.

##Limitations

- Looks for column indentifiers in `<th>` elements. If your identifier lies in a `<td>` , its likely to not be found.

- No support for overlapping data , or series. 

- Works in a very anonymous way;treats dom elements generally. For example, there is currently no way to say grab data from the 6th , and only 6th table on a page, if the column identifier is shared with other tables. Furthermore, specific selectors like #id's and .class selectors are not supported.
