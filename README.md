# owl2jsonschema.js
> ### **WIP**
> > Do not use for production yet. Might change or rename at anytime.

Convert OWL / RDFS / XML Schema to JSON Schema.
---

OWL 2 JSON SCHEMA wants to build a bridge between the semantically XML web and the semantically JSON web and is a converter from OWL as RDF/XML to JSON Schema (currently draft 4).
Full XML Schema support will come soon. For now an OWL Ontology is required.

*Why?* <br/>
Most ontologies on the web use OWL+RDF/XML or RDF/Turtle or RDF/NTriples (which translate 1:1 to RDF/XML). <br />spec.: <br />
> "The primary exchange syntax for OWL 2 is RDF/XML; this is indeed the only syntax that must be supported by all OWL 2 tools."

So RDF/XML Schema is Lingua Franca. Let us create a canonical JSON representation for this.

It is planned to support several **proposals for JSON Schema v5 draft** which close gaps between OWL and JSON Schema. For example <br/>
- [x] [translations](https://github.com/json-schema/json-schema/wiki/translations-(v5-proposal))
- [ ] [switch](https://github.com/json-schema/json-schema/wiki/switch-(v5-proposal))
- [ ] [propertyLinks](https://github.com/json-schema/json-schema/wiki/propertyLinks-(v5-proposal))

So whenever the documentation refers to "JSON Schema" it means :<br/>
"JSON Schema and hyperschema - including the above mentioned inofficial proposals".

This is nightly written from scratch, might currently contain bugs and is incomplete.<br/>
Currently working on: The resolving of external URIs and Ontologies.
 
## Supported platforms

node.js >= 0.10.0

## Installation
 
For now <br/>
```
git clone https://github.com/redaktor/owl2jsonschema.js.git
```

```
cd owl2jsonschema.js
```

```
npm install
```
 A demo is included. It will create the JSON Schemas of the [dbpedia](http://dbpedia.org/About) Ontology.<br/> This will create the schema files in demo/OUTPUT:

```javascript
node demo
```

## Usage
```
var owl2jsonschema = require('owl2jsonschema');
var parser = new owl2jsonschema(/*[options object]*/);
```

and now parse *url* OR *file* OR *string*

// url, options, callback
```
parser.parse('http://mappings.dbpedia.org/server/ontology/export' /*, [callback function]*/ );
```
OR<br/>
// file, options, callback<br/>
(if file path is relative then './' is the folder of your script)
```
parser.parse('./export.xml' /*, [options object], [callback function]*/);
```
OR<br/>
// string, options, callback
```
parser.parse('<?xml><rdf:RDF><owl:Ontology>...</owl:Ontology>...</rdf:RDF>' /*, [callback function]*/);
 ```
 
## Contributing
 
1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D
 
## History
 
TODO: Write history
 
## Credits
 
Once OWL/RDFS is transformed, this uses the logic of [schema-org-gen](https://github.com/geraintluff/schema-org-gen) by Geraint Luff.
 
## License
 
TODO: Write license
