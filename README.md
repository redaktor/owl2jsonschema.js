# owl2jsonschema.js
> ### **WIP**
> > Do not use for production yet. Might change or rename at anytime.
>

Convert OWL/RDFS XML to JSON Schema.
---

OWL 2 JSON SCHEMA wants to build a bridge between the semantically XML web and the semantically JSON web and is a converter from OWL / RDFS expressed in XML to JSON Schema (currently draft 4).
Full XML Schema support will come soon. For now an OWL Ontology is required.

*Why?* <br/>
Most ontologies on the web use OWL and RDF/Turtle or RDF/NTriples which can be translated 1:1 to RDF/XML. <br />
OWL/RDF/XML is Lingua Franca. Let us create a canonical JSON representation for this.

It is planned to support several proposals for JSON Schema v5 draft which close gaps between OWL and XML Schema. For example <br/>
- [x] [translations](https://github.com/json-schema/json-schema/wiki/translations-(v5-proposal))
- [ ] [$data](https://github.com/json-schema/json-schema/wiki/%24data-(v5-proposal))
- [ ] [propertyLinks](https://github.com/json-schema/json-schema/wiki/propertyLinks-(v5-proposal))


This is nightly written from scratch, might currently contain bugs and is incomplete.<br/>
 
## Supported platforms

node.js >= 0.10.0

## Installation
 
For now <br/>
```
git clone https://github.com/redaktor/owl2jsonschema.js.git
```

```
cd owl2jsonschema
```

```
npm install
```
 A demo is included. It will create the JSON Schemas of the [dbpedia](http://dbpedia.org/About) Ontology.<br/> This will create the schema files in demo/OUTPUT:

```javascript
node demo
```

## Usage
// url, options, callback
```
var parseOWL = require('owl2jsonschema');
parseOWL('http://mappings.dbpedia.org/server/ontology/export' /*, [options object], [callback function]*/ );
```
or<br/>
// file, options, callback<br/>
(if file path is relative then './' is the folder of your script)
```
var parseOWL = require('owl2jsonschema');
parseOWL('./export.xml' /*, [options object], [callback function]*/);
```
or<br/>
// string, options, callback
```
parseOWL('<?xml><rdf:RDF><owl:Ontology>...</owl:Ontology>...</rdf:RDF>' /*, [options object], [callback function]*/);
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
