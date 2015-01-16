var parseOWL = require('../index.js'); 
/* becomes require('owl2jsonschema') */

/*
//	You can parse remote or local, absolute or relative files or an xml string :
//	NOTE - currently there must be an RDF Container and an OWL Ontology present ...
*/

// CREATES files containing the JSON Schemas in a folder OUTPUT/[host]_[path]
// RETURNS in [callback function] a string containing the JSON structure by default
parseOWL('http://mappings.dbpedia.org/server/ontology/export' /*, [options object], [callback function]*/ );

// OR
// parseOWL('./export.xml' /*, [options object], [callback function]*/);
// OR
// parseOWL('<?xml><rdf:RDF><owl:Ontology>...</owl:Ontology>...</rdf:RDF>' /*, [options object], [callback function]*/);