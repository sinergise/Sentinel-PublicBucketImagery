var baseUrl = "http://www.geopedia.world";
var baseRestUrl = baseUrl + "/rest/data/v1";
var sessionId = null;
var tableMetadataList = {};
var messageListeners = [];
var earthRadius = 6378137; 


window.onload = function () {
	if (typeof window.addEventListener !== 'undefined') {
		window.addEventListener('message', gp_onMessage, false);
	} else if (typeof window.attachEvent !== 'undefined') {
		window.attachEvent('onmessage', gp_onMessage);
	}
}

function round(number, numDecimals) {
	var exp = Math.pow(10, numDecimals);
	return Math.round(number * exp) / exp;
}

function geometryToString(geomType, geometry, numDecimals) {
	if (geomType == "point") {
		return round(pointGeom.x, numDecimals) + ", " + round(pointGeom.y, numDecimals);
	}
	return "";
}

function stringToGeometry(geomType, strValue) {
	var values = /([0-9\.\-]+)\,\s*([0-9\.\-]+)/.exec(strValue);
	if ((values == null) || (values.length < 3)) {
		return null;
	}
	return {
		x: values[1],
		y: values[2]
	}
}

function geometryToWKT(geomType, geometry) {
	if (geometry == null) {
		return null;
	}
	if (geomType == "point") {
		return "POINT(" + geometry.x + " " + geometry.y + ")";
	}
	return null;
}

function wgs84ToMercator(pointGeometry) {
	return {
		x : earthRadius * pointGeometry.y * Math.PI / 180,
		y : earthRadius * Math.log(Math.tan(Math.PI * (1 + pointGeometry.x / 90) / 4))
	};
}

function mercatorToWgs84(pointGeometry) {
	return {
		x : 90 - 360 * Math.atan(Math.exp(-pointGeometry.y / earthRadius)) / Math.PI,
		y : 180 * pointGeometry.x / (earthRadius * Math.PI)
	};
}

function addMessageListener(listener) {
	messageListeners.push(listener);
}

function gp_onMessage(event) {
	var data = JSON.parse(event.data);
	if (data.error) {
		console.log(data.errorMessage);
	}
	
	if ((data.command == "status") && (data.status == "INITIALIZED")) {
		sessionId = data.sessionValue;
	}
	
	for (i = 0; i < messageListeners.length; i++) {
		messageListeners[i](data);
	}
}

function gp_postMessage(iframeID, obj) {
	document.getElementById(iframeID).contentWindow.postMessage(JSON.stringify(obj), "*");
}
function gp_postMessage_dialog(iframeID, obj) {
	$("#" + iframeID).get(0).contentWindow.postMessage(JSON.stringify(obj), "*");
}

function addMarker() {
	gp_postMessage("geopediaWidget", {
		"command" : "markers",
		"operation" : "clear"
	});
	gp_postMessage("geopediaWidget",{
		"command" : "markers",
		"operation" : "add"
	});
}
function showFeature(tableId, featureId) {
	gp_postMessage("geopediaWidget", {
		"command" : "markers",
		"operation" : "clear"
	});
	gp_postMessage("geopediaWidget",{
		"command" : "featureCtl",
		"tableId" : tableId,
		"featureId" : featureId,
		"applyLocation" : true,
		"applyScale" : true
	});
}

function createUniqueFilter(type, field, operation, valueType, literalValue) {
	if (field != "") {
		return {
			type : type,
			left : {
				type : "field",
				fieldIdentifier : field
			},
			right : {
				type : "literal",
				value : {
					type : valueType,
					value : literalValue
				}
			},
			operator : operation
		};
	}
	return null;
}

function createFieldFilter(field, operation, literalValue) {
	if (field != "") {
		return {
			type : "comparisonOperation",
			left : {
				type : "field",
				fieldIdentifier : field
			},
			right : {
				type : "literal",
				value : {
					type : "long",
					value : literalValue
				}
			},
			operator : operation
		};
	}
	return null;
}
function createEqualFieldFilter(field, literalValue) {
	return createFieldFilter(field, "EQUALS", literalValue);
}

function combineFilters(filters, operation) {
	if (filters == null) {
		return null;
	}
	if (filters.length == 1) {
		return filters[0];
	} else if (filters.length > 1) {
		return {
			type : "logicalOperation",
			operator : operation,
			operands : filters
		};
	}
	return null;
}

function showThemeLayer(layerId, visible) {
	showLayers("geopediaWidget", [layerId], "themeTable", visible);
}
function showLayers(listOfTables, type, visible) {
	showLayers("geopediaWidget",type, visible);
}
function showLayers(iframeID, listOfTables, type, visible) {
	var toggleCommand = {
			command : "toggle",
			toggleables : []
	};
	
	for (i = 0; i < listOfTables.length; i++) {
		toggleCommand.toggleables.push({
			target : type,
			identifier : listOfTables[i],
			value : visible ? "on" : "off"
		});
	}
	
	gp_postMessage(iframeID,toggleCommand);
}

function fieldTypeToPropertyType(fieldType) {
	switch (fieldType) {
		case "IDENTIFIER": return "long";
		case "NUMERIC": return "double";
		case "PLAINTEXT": return "text";
		case "WIKITEXT": return "html";
		case "BINARYREFERENCE": return "binaryReferenceArray";  
		case "DATETIME": return "date";
		case "STYLE": return "text";
		case "BOOLEAN": return "boolean";
		case "GEOMETRY": return "geometry";
		default: return null;
	}
}

function createFeature(featureId, tableId, fieldsMap) {
	if (!tableMetadataList[tableId]) {
		return null;
	}
	
	var properties = [];
	var fields = tableMetadataList[tableId].fields;
	
	for (i = 0; i < fields.length; i++) {
		var field = fields[i];
		var fieldId = field.id;
		var fieldMetaType = field.type;
		
		var fieldValue = null;
		if ((field.name == "d") && field.isSystemField) {
			fieldValue = false;
		}
		if (fieldsMap[fieldId] != null) {
			fieldValue = document.getElementById(fieldsMap[fieldId]).value;
		}
		if (fieldMetaType == "GEOMETRY") {
			var geom = stringToGeometry("point", fieldValue);
			if (geom == null) {
				alert("Must set the latitude and the longitude before submitting!");
				return null;
			}
			fieldValue = {
				"wkt" : geometryToWKT("point", geom),
				"crsId" : "EPSG:4326"
			};
		}
		
		properties.push({
			type : fieldTypeToPropertyType(fieldMetaType),
			value : fieldValue
		});
	}

	var feature = { 
		"id" : featureId,
		"properties" : properties,
		"lastUserId" : null,
		"tableId" : tableId,
		"table" : null,
		"storeAction" : "INSERT",
		"name" : null,
		"revision" : 0,
		"dataScope" : "ALL"
	};
	
	return feature;
}

function getTableMetadata(tableId) {
	var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
		if ((xhr.readyState == 4) && (xhr.status == 200)) {
			var tableMeta = JSON.parse(xhr.responseText);
			if (tableMeta) {
				var tableFields = [];
				for (i = 0; i < tableMeta.fields.length; i++) {
					var field = tableMeta.fields[i];
					tableFields.push({
						id : field.id,
						name: field.name,
						description: field.description,
						type: field.type,
						isSystemField: field.isSystemField
					});
				}
				
				tableMetadataList[tableId] = {
					id : tableId,
					fields: tableFields
				}
			}
		}
	}
	xhr.open("GET", baseRestUrl + "/meta/table/" + tableId + "?sid=" + sessionId, true);
	xhr.setRequestHeader("Content-type", "application/json; charset=utf-8");
	xhr.send(null);
}

function saveFeature(feature, callbackOnSuccess) {
	var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
		if (xhr.readyState == 4) { 
			if (xhr.status == 200) {
				//alert("Feature successfully saved!");
				callbackOnSuccess();
			}
			else {
				alert("Cannot submit your entry. Please, retry.");
			}
		}
	}
	xhr.open("POST", baseRestUrl + "/features/save?sid=" + sessionId, true);
	xhr.setRequestHeader("Content-type", "application/json; charset=utf-8");
	xhr.send(JSON.stringify(feature));
}

function getCodelistFeatures(tableId, idFieldIndex, valueFieldIndex) {
	var queryCommand = {
		tableId : tableId,
		resultSelector : {
			type: "FeatureResultSelector", 
			fieldSelectionSet: ["SYSTEM_FIELDS", "USER_FIELDS_WITHOUT_GEOMETRIES"]
		},
		filter: {
			type : "comparisonOperation",
			left : {
				type : "field",
				fieldIdentifier : "d" + tableId
			},
			right : {
				type : "literal",
				value : {
					type : "boolean",
					value : false
				}
			},
			operator : "EQUALS"
		}
	};
	
	var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
		if ((xhr.readyState == 4) && (xhr.status == 200)) {
			
			var queryResults = JSON.parse(xhr.responseText);
			if (queryResults.results) {
				var codeListItems = [];
				for (i = 0; i < queryResults.results.length; i++) {
					//var codeListItem = document.createElement('option');
					alert (queryResults.results[i].properties[idFieldIndex].value + "/" + queryResults.results[i].properties[valueFieldIndex].value);
					//codeListItems.push(codeListItem);
				}
				

				/*codeListItems.sort(function(item1, item2) {
					if (item1.text > item2.text) {
						return -1;
					}
					if (item1.text < item2.text) {
						return +1;
					}
					return 0;
				});
				
				for (i = 0; i < codeListItems.length; i++) {
					comboBoxElem.add(codeListItems[i], 0);
				}*/
			}
		}
	}
	xhr.open("POST", baseRestUrl + "/features/executeQuery?sid=" + sessionId, true);
	xhr.setRequestHeader("Content-type", "application/json; charset=utf-8");
	xhr.send(JSON.stringify(queryCommand));
}

function areMandatoryFilled(formList){
	if (formList==null){
		return true;
	}
	for(i = 0; i<formList.length; i++) {
		var formValue = document.getElementById(formList[i]).value;
		if (formValue==null || formValue.length==0){
			return false;
		}
	}
	return true;
}
