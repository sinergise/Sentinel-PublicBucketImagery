//var hasAside = true;
//var loadMainWidget = true;
//var categories = [];
//var activeLayers = [];
//var listGroups = {};
//var vars3d = "";
//var printVars = "";
//var places = {};
//var doPrint = false;
//var is3d = false;
//var is3dloaded = false;
//var isAllOff = true;

addMessageListener(messageListener);

function messageListener(data) {
	if (data.error) {
		$("#loadingPanel .spinner").remove();
		$("#loadingPanel p").text("An error occured while loading. Please refresh page.");
	}
	if ((data.command == "status") && (data.status == "THEME_LOADED")) {
		$("#loadingPanel").fadeOut();
		applyFilter();
	}
}

function loadTableInfo(themetablename, id, anchor) {
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		$(anchor).addClass("disabled");
		if (xhr.readyState == 4) {
			if (xhr.status == 200) {
				var tableMeta = JSON.parse(xhr.responseText);
				showTableDesc(themetablename, tableMeta);
			} else {
				alert("Cannot submit your entry. Please, retry.");
			}
			$(anchor).removeClass("disabled");
		}

	}

	xhr.open("GET", baseRestUrl + "/meta/table/" + id + "?sid=" + sessionId, true);
	xhr.setRequestHeader("Content-type", "application/json; charset=utf-8");
	xhr.send();
}

function applyFilter() {
	var allFilters = [{
		"tableId" : "1042",
		"themeTableId" : null,
		"filter" : {
			"type" : "logicalOperation",
			"operands" : [ {
				"type" : "comparisonOperation",
				"left" : {
					"type" : "field",
					"fieldIdentifier" : "f9455"
				},
				"middle" : null,
				"right" : {
					"type" : "literal",
					"value" : {
						"type" : "double",
						"value" : $("#cloudSlider").rangeSlider("values").min
					}
				},
				"operator" : "GREATER_OR_EQUAL"
			}, {
				"type" : "comparisonOperation",
				"left" : {
					"type" : "field",
					"fieldIdentifier" : "f9455"
				},
				"middle" : null,
				"right" : {
					"type" : "literal",
					"value" : {
						"type" : "double",
						"value" : $("#cloudSlider").rangeSlider("values").max
					}
				},
				"operator" : "LESS_OR_EQUAL"
			}, {
				"type" : "comparisonOperation",
				"left" : {
					"type" : "field",
					"fieldIdentifier" : "f9467"
				},
				"middle" : null,
				"right" : {
					"type" : "literal",
					"value" : {
						"type" : "date",
						"value" : $("#dateSlider").dateRangeSlider("values").min.getTime()
					}
				},
				"operator" : "GREATER_OR_EQUAL"
			}, {
				"type" : "comparisonOperation",
				"left" : {
					"type" : "field",
					"fieldIdentifier" : "f9467"
				},
				"middle" : null,
				"right" : {
					"type" : "literal",
					"value" : {
						"type" : "date",
						"value" : $("#dateSlider").dateRangeSlider("values").max.getTime()
					}
				},
				"operator" : "LESS_OR_EQUAL"
			} ],
			"operator" : "AND"
		}
	} ];
	gp_postMessage("geopediaWidget", {
		command : "setFilters",
		filters : allFilters
	});
}

function addLeadingZero(number) {
	if (number < 10) {
		return "0" + number.toString();
	} else 
		return number;
}
function setMapHeight() {
	$("#map").height($(window).height() - $("#header").outerHeight() - 3);
}
$(function(){
    
    $("#geocomplete").geocomplete()
      .bind("geocode:result", function(event, result){
        var point = {"x": result.geometry.location.lat(), "y": result.geometry.location.lng()};
        var transform = wgs84ToMercator(point);
        gp_postMessage("geopediaWidget", {"command":"setPosition","x":transform.x,"y":transform.y, "zoomLevel":result.types[0] == "street_address" ? 17 : 11})
      })
      .bind("geocode:error", function(event, status){
        console.log("ERROR: " + status);
        alert("An error occured. Please try again.");
      })
      .bind("geocode:multiple", function(event, results){
        console.log("Multiple: " + results.length + " results found");
      });
    
    $("#find").click(function(){
      $("#geocomplete").trigger("geocode");
    });
    
  });


var maxDate = new Date(moment().format("YYYY-MM-DD"));
var minDate = new Date("2015-11-25");
$(document).ready(function() {
	setMapHeight();

	$("#toggleSidebar").click(function() {
		$("#sidebar").toggleClass("smallLayers");
		hasAside = !hasAside;
		if (hasAside) {
			$(this).find("i").attr("class", "icon-angle-left");
		} else {
			$(this).find("i").attr("class", "icon-angle-right");
		}
	});

	$("#cloudSlider").rangeSlider({
		bounds : {
			min : 0,
			max : 100
		},
		defaultValues : {
			min : 0,
			max : 20
		},
		step : 1,
		arrows : false,
		wheelMode: "scroll"
	});

	$("#dateSlider").dateRangeSlider(
		{
			bounds : {
				"min" : minDate,
				"max" : maxDate
			},
			step : {
				days : 1
			},
			formatter : function(val) {
				return (val.getFullYear()) + "-"
						+ addLeadingZero(val.getMonth() + 1) + "-"
						+ addLeadingZero(val.getDate());
			},
			defaultValues : {
				min : moment(maxDate).subtract(1, 'week'),
				max : maxDate
			},
			arrows : false,
			wheelMode: "scroll"
		});
	$("#dateSlider, #cloudSlider").bind("valuesChanging", function(e, data){
		iframeFix(true);
	});
	$("#dateSlider, #cloudSlider").bind("valuesChanged", function(e, data){
		iframeFix(false);
	});
	$("#dateSlider, #cloudSlider").on("userValuesChanged", function(e, data) {
		copyDates(true);
	});
	$( "#startDate" ).datepicker({ minDate: minDate, maxDate: maxDate, dateFormat: "yy-mm-dd", onSelect:function (dateText, inst) {
        copyDates(false);
	}
	});
	$( "#startDate, #endDate" ).change(function() {
		copyDates(false);
	});
	$( "#endDate" ).datepicker({ minDate: minDate, maxDate: maxDate, dateFormat: "yy-mm-dd", onSelect:function (dateText, inst) {
        copyDates(false);
	} });
	
	$(".dateHeading a").click(function() {
		$(".dateHeading a").removeClass("active");
		$(this).addClass("active");
		$(".dateHolder").hide();
		if ($(this).attr("id") == "sliderMode") {
			$("#dateSlider").show();
		} else {
			$("#manualDate").show();
		}
		copyDates($(this).attr("id") == "sliderMode");
	});

	$("#manualDate").hide();
	copyDates(true);

});

function iframeFix(dragging) {
	if (dragging) {
		$("#iframeFix").show();
	} else {
		$("#iframeFix").hide();
	}
}

function copyDates(sliderMode) {
	if (sliderMode) {
		$( "#startDate" ).datepicker( "setDate", moment($("#dateSlider").dateRangeSlider("values").min.getTime()).format("YYYY-MM-DD") );
		$( "#endDate" ).datepicker( "setDate", moment($("#dateSlider").dateRangeSlider("values").max.getTime()).format("YYYY-MM-DD") );
		$('#dateSlider').dateRangeSlider('resize');
	} else {
		$("#dateSlider").dateRangeSlider("values", //new Date(2014, 0, 1), new Date(2015, 0, 31) 
			$( "#startDate" ).datepicker( "getDate"),
			$( "#endDate" ).datepicker( "getDate")
		);
	}
	applyFilter();
}

$(window).resize(function() {
	setMapHeight();
})
