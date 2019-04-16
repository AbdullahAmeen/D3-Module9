//Begin a eself-executing anonymous function to move to local scope
(function(){

//pseudo-global variables

var attrArray = ["State","Percent of Graduates Tested", "Average Composite Score", "Percent Meeting English Benchmark", 
				"Percent Meeting Reading Benchmark", "Percent Meeting Math Benchmark","Percent Meeting Science Benchmark"]; //list of attributes from csv data file
				
//attribute to be siplayed on the bar chart. This might be be changed in the next module as we will have dynamic attributes
var expressed = attrArray[5]; 

//begin script when window loads
window.onload = setMap();


//Begine setMap function - (choropleth)
function setMap(){
	//map frame dimensions
	var width = window.innerWidth * 0.5,
        height = 550;

	//creating svg container for the map
	var map = d3.select("body")
		.append("svg")
		.attr("class", "map")
		.attr("width", width)
		.attr("height", height);

	//create Albers equal area conic projection centered on USA
	 var projection = d3.geoAlbers()
        .center([-1, 24.6])
        .rotate([96.53, -15.56, 0])
        .parallels([18.5, 33.18])
        .scale(800)
        .translate([width / 2, height /2.2]);
	// Define a geoPath
	 var path = d3.geoPath()
        .projection(projection);
	

	//use Promises to parallelize asynchronous data loading
	var promises = [];
    promises.push(d3.csv("data/AverageACTScoreBYStateGraduatingClass2018.csv")); //loading the csv data file or the attributes file
    promises.push(d3.json("data/States.topojson")); //loading the special data file (States)
    Promise.all(promises).then(callback);

	function callback(data, csvData, states){
		csvData = data[0];
		states = data[1];
		console.log(csvData);
		console.log(states.objects.States);
		
		setGraticule(map, path); //place graticule on the map
		
		//Translate USStates back to JSON and adding US States to map
		var usStates = topojson.feature(states, states.objects.States).features;
		var allstates = map.append("path")
			.datum(usStates)
			.attr("class","state")
			.attr("d", path);

		//join csv data to GeoJSON enumeration units. 
		//This part of the script came here after the Join Data function was defined.
		usStates = joinData(usStates, csvData);

		//Create the color scale. This part of the script came here after the COlor Scale function was defined,
		var colorScale = makeColorScale(csvData);

		//Add enumeration units to the map. This part of the script came here after the enumeration function was defined.
		setEnumerationUnits(usStates, map, path, colorScale);

		//Add coordinated visualization to the map.This part of the script came her after the SetChart function was defined
		setChart(csvData, colorScale);
	};
};
//end of function setMap - choropleth



//Begine setGraticule function
function setGraticule(map, path){
	//create graticule generator
	var graticule = d3.geoGraticule()
        .step([25, 25]); //place graticule lines every 25 degrees of longitude and latitude

	//create graticule background
	var gratBackground = map.append("path")
        .datum(graticule.outline()) //bind graticule background
        .attr("class", "gratBackground") //assign class for styling
        .attr("d", path) //project graticule

	//create graticule lines	
	var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
		.data(graticule.lines()) //bind graticule lines to each element to be created
	  	.enter() //create an element for each datum
		.append("path") //append each element to the svg as a path element
		.attr("class", "gratLines") //assign class for styling
		.attr("d", path); //project graticule lines
};
//End setGraticule function


//Begine function Joining CSV attributes to the USStates special datasest
function joinData(usStates, csvData){
	//loop through csv to assign each set of csv attribute values to geojson region
	for (var i=0; i<csvData.length; i++){
		var csvstates = csvData[i]; //the current region
		var csvKey = csvstates.STATEFP; //the CSV primary key

		//loop through geojson regions to find correct region
		for (var a=0; a<usStates.length; a++){
			
			var geojsonProps = usStates[a].properties; //the current region geojson properties
			var geojsonKey = geojsonProps.STATEFP; //the geojson primary key

			//where primary keys match, transfer csv data to geojson properties object
			if (geojsonKey == csvKey){

				//assign all attributes and values
				attrArray.forEach(function(attr){
					var val = parseFloat(csvstates[attr]); //get csv attribute value
					geojsonProps[attr] = val; //assign attribute and value to geojson properties
				});
			};
		};
	};

	return usStates;
};
//End function Joining CSV attributes to the USStates special datasest



// Begine function Setting up the Enumeration.
function setEnumerationUnits(usStates, map, path, colorScale){

	//add USStates to map
	var allstates = map.selectAll(".allstates")
        .data(usStates)
        .enter()
        .append("path")
        .attr("class", function(d){
             return "state";
    })
        .attr("d", path)
		.style("fill", function(d){
			return choropleth(d.properties, colorScale);
		});
};
// End function Setting up the Enumeration.


//Begine function to create color scale generator
function makeColorScale(data){
	var colorClasses = [
		"#ffffcc",
		"#a1dab4",
		"#41b6c4",
		"#2c7fb8",
		"#253494"
		];

	//create color scale generator
	var colorScale = d3.scaleThreshold()
		.range(colorClasses);

	//build array of all values of the expressed attribute
	var domainArray = [];
	for (var i=0; i<data.length; i++){
		var val = parseFloat(data[i][expressed]);
		domainArray.push(val);
	};

	//cluster data using ckmeans clustering algorithm to create natural breaks
	var clusters = ss.ckmeans(domainArray, 5);
	//reset domain array to cluster minimums
	domainArray = clusters.map(function(d){
		return d3.min(d);
	});
	//remove first value from domain array to create class breakpoints
	domainArray.shift();

	//assign array of last 4 cluster minimums as domain
	colorScale.domain(domainArray);

	return colorScale;
};
//End function to create color scale generator



//Beginefunction to test for data value and return color
function choropleth(props, colorScale){
	//make sure attribute value is a number
	var val = parseFloat(props[expressed]);
	//if attribute value exists, assign a color; otherwise assign gray
	if (typeof val == 'number' && !isNaN(val)){
		return colorScale(val);
	} else {
		return "blue";
	};
};
//End function to test for data value and return color


//Begine function to create coordinated bar chart
function setChart(csvData, colorScale){
	//chart frame dimensions
	var chartWidth = window.innerWidth * 0.45,
		chartHeight = 350,
		leftPadding = 25,
		rightPadding = 5,
		topBottomPadding =5,
		innerWidth = chartWidth - leftPadding - rightPadding,
		innerHeight = chartHeight - topBottomPadding,
		translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

	//create a second svg element to hold the bar chart
	var chart = d3.select("body")
		.append("svg")
		.attr("width", chartWidth)
		.attr("height", chartHeight)
		.attr("class", "chart");

	//create a rectangle for chart background fill
	var chartBackground = chart.append("rect")
		.attr("class", "chartBackground")
		.attr("width", innerWidth)
		.attr("height", innerHeight)
		.attr("transform", translate);
		//creating a frame for chart border
	var chartFrame = chart.append("rect")
		.attr("class", "chartFrame")
		.attr("width", innerWidth)
		.attr("height", innerHeight)
		.attr("transform", translate);

	//create a scale to size bars proportionally to frame and for axis
	var yScale = d3.scaleLinear()
		.range([0, chartHeight])
		.domain([100,0]);

	//set bars for each province
	var bars = chart.selectAll(".bar")
		.data(csvData)
		.enter()
		.append("rect")
		.sort(function(a, b){
			return parseFloat(b[expressed])-parseFloat(a[expressed])
		})
		.attr("class", function(d){
			return "bar " + d.STATEFP;
		})
		.attr("width", innerWidth / csvData.length - 1)
		.attr("x", function(d, i){
			return i * (innerWidth / csvData.length) + leftPadding;
		})
		.attr("height", function(d, i){
			return 400 - yScale(parseFloat(d[expressed]));
		})
		.attr("y", function(d, i){
			return yScale(parseFloat(d[expressed])) + topBottomPadding-6;
		})
		.style("fill", function(d){
			return choropleth(d, colorScale);
		});


	//create a text element for the chart title
	var chartTitle = chart.append("text")
		.attr("x", 40)
		.attr("y", 40)
		.attr("class", "chartTitle")
		.text("Percent Meeting Math Benchmark at the ACT test in 2018");

	//Creating a vertical axis generator
	var yAxis = d3.axisLeft()
		.scale(yScale);

	//placing the axis
	var axis = chart.append("g")
		.attr("class", "axis")
		.attr("transform", translate)
		.call(yAxis);
};
//End function to create coordinated bar chart

})();
//End a eself-executing anonymous function to move to local scope