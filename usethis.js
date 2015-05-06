var request = require("request"),
  cheerio = require("cheerio"),
  url = "http://usesthis.com/interviews/",

  results = {
    hardware: {},
    software: {}
  },
  page = 1,
  totalPages = 57,
  totalResults = 0,
  resultsDownloaded = 0;

function callback () {
  resultsDownloaded++;

  if (resultsDownloaded !== totalResults) {
    return;
  } else if(page !== totalPages){
    page++
    return scrape(page);
  }

  outputResults('hardware');
  outputResults('software');
}

function outputResults(section){
  var links = [];

  // stick all links in an array
  for (prop in results[section]) {
    links.push({
      name: prop,
      count: results[section][prop]
    });
  }

  // sort array based on how often they occur
  links.sort(function (a, b) {
    return b.count - a.count;
  });

  // finally, log the first fifty most popular links
  console.log("TOP 200 - %s", section);
  console.log(links.slice(0, 200));
}

function scrape(p){
  if(p > 1)
    var path = url + "/page" + p;
  else{
    var path = url;
  }

  request(path, function (error, response, body) {
    console.log("Loading page %d", page);

    if (error) {
      console.log("Couldn't get page because of error: " + error);
      return;
    }

    // load the body of the page into Cheerio so we can traverse the DOM
    var $ = cheerio.load(body),
      permalinks = $("a.p-name");

    permalinks.each(function (i, permalink) {
      // get the href attribute of each permalink
      var url = $(permalink).attr("href");
      if (url.charAt(0) === "/") return;

      // this permalink counts as a result, so increment results
      totalResults++;

      // download that page
      request(url, function (error, response, body) {
        // console.log("Loading page: %s", url);
        if (error) {
          console.log("Couldn't get page because of error: " + error);
          return;
        }

        // load the page into cheerio
        var $post = cheerio.load(body);
        var $h4 = $post('.e-content h4');

        $h4.each(function(i, h4){
          var h4Text = $(h4).text();
          var h4Words = h4Text.split(' ').map(function(str){
            return str.toLowerCase().replace('?', '');
          });

          if(h4Words.indexOf('hardware') != -1 || h4Words.indexOf('software') != -1){
            var section = 'hardware';

            if(h4Words.indexOf('software') != -1){
              section = 'software'
            }

            $(h4).nextUntil('h4', 'p').each(function(i, p){
              extractLinks($, p, section);
            });
          }
        });

        // and when our request is completed, call the callback to wrap up!
        callback();
      });
    });
  });
}

function extractLinks($, p, section){
  var $link = $(p).find('a');
  $link.each(function(i, link){
    var name = $(link).text().toLowerCase();
    if(['these', 'this'].indexOf(name) != -1){
      name = $(link).attr('href');
    }

    if (results[section][name]) {
      // if this name is already in our "results", our collection
      // of terms, increase the count by one
      results[section][name]++;
    } else {
      // otherwise, say that we've found one of that name so far
      results[section][name] = 1;
    }
  });
}

scrape(page);