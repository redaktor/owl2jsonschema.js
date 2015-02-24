var owl2jsonschema = require('../index.js');
/* becomes require('owl2jsonschema') */
var parser = new owl2jsonschema(/*[options object]*/);
/*
//	You can parse remote or local, absolute or relative files or an xml string :
//	NOTE - currently there must be an RDF Container and an OWL Ontology present ...
*/
// CREATES files containing the JSON Schemas in a folder OUTPUT/[host]_[path]
// RETURNS in [callback function] a string containing the JSON structure by default

parser.parse('http://mappings.dbpedia.org/server/ontology/export', function(){ 
	console.log( 'FINAL CALLBACK fn says READY. ;)' ); 
} );
// EXAMPLES :
// parser.parse('http://purl.org/NET/cidoc-crm/core');
// parser.parse('http://www.ontologydesignpatterns.org/ont/dul/DUL.owl');
// OR
// parser.parse('./export.xml' /*, [callback function]*/);
// OR
// parser.parse('<?xml><rdf:RDF><owl:Ontology>...</owl:Ontology>...</rdf:RDF>' /*, [callback function]*/);