#!/usr/bin/env node

var es = require('event-stream');
var mgenerate = require('../');
var _ = require('lodash');
var read = require('fs').readFileSync;

var debug = require('debug')('mgenerate:bin');

var yargs = require('yargs')
  .option('number', {
    alias: 'n',
    describe: 'number of documents to return',
    type: 'number',
    default: 1
  })
  .example('$0 -n 5 template.json', 'generates 5 documents based on the'
           + ' given template file.\n')
  .example('$0 \'{"name": "$name", "emails": {"$array": {"of": "$email", '
           + '"number": 3}}}\'', 'generates 1 document based on the given'
           + ' JSON template.\n')
  .example('cat template.json | $0 --number 20', 'pipe template file to mgenerate'
           + ' and generate 20 documents.\n')
  .example('$0 -n3 < template.json', 'pipe template file to mgenerate'
          + ' and generate 3 documents.')
  .help()
  // .epilogue('For more information, check the documentation at'
  //   + ' https://github.com/rueckstiess/mgenerate.js')
  .version()
  .wrap(100);


if (process.stdin.isTTY) {
  // running in TTY mode, get template from non-positional argument
  yargs.usage('Usage: $0 <options> [template]')
    .demand(1, 'must provide a template file or string');
} else {
  yargs.usage('Usage: [template] > $0 <options>');
}

var argv = yargs.argv;
var template;

function generate() {
  es.readable(function(count, callback) {
    if (count >= argv.number) {
      return this.emit('end');
    }
    this.emit('data', mgenerate(template));
    callback();
  }).pipe(es.stringify())
    .pipe(process.stdout);
}

if (process.stdin.isTTY) {
  var str = argv._[0];
  template = _.startsWith(str, '{') ? JSON.parse(str) : JSON.parse(read(str));
  generate();
} else {
  template = '';
  process.stdin.setEncoding('utf-8');
  process.stdin.on('readable', function() {
    var chunk = process.stdin.read();
    if (chunk !== null) {
      template += chunk;
    }
  });
  process.stdin.on('end', function() {
    template = JSON.parse(template);
    generate();
  });
}
