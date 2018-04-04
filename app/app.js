'use strict';

angular.module('appMaps', ['uiGmapgoogle-maps', 'googlechart', 'ngMaterial', 'ngMessages'])
    .controller('mainCtrl', function($scope, $http, $timeout, $q) {
        /////////////graphs///////////////
        this.message = "I am a simple calculator";
        //ID's of view's//
        //Map View id='1'//
        //Current Usage View Id='2'//
        //History Usage View Id='3'//

        // Hashmaps//
        var markerbyStationId = new HashMap();
        var stationsbyId = new HashMap();
        var historyDatabyStationId = new HashMap();
        var currentChartDataByStationId = new HashMap();

        //Filter Variables
        var mapFilterApplied = false;
        var currentUsageFilterApplied = false;
        var historyUsageFilterApplied = false;
        var filterStationId = 0;

        var lastUpdated = 0;
        $scope.map = { center: { latitude: 40.76727216, longitude: -73.99392888 }, zoom: 70 };
        $scope.markers = [];

        $scope.staticData;
        var greenicon = "icons/green-marker.png";
        var orangeicon = "icons/orange-marker.png";
        var redicon = "icons/red-marker.png";
        var saveMarkers;
        var currentGraphSaved;
        var historyGraphSaved;
        var allColoumsSaved;
        var graphData;

        $scope.myChartObject = {};
        var self = this;
        $scope.currentView = '1'; //by default map view
        var seconds = 0;
        // list of `state` value/display objects
        //autocomplete variables
        self.stationsforAutocomplete = null;
        self.selectedItem = null;
        self.searchText = null;
        self.querySearch = querySearch;
        /////////////////////////

        $scope.distance = 3; //default value 

        //current graph object
        $scope.myChartObject.type = "ColumnChart";
        var timeperminute = 0;
        $scope.selectView = function(viewId) {
            if ($scope.currentView == viewId) {
                return;
            }
            $scope.currentView = viewId;
        }
        $scope.myChartObject.data = {
            "cols": [
                { id: "t", label: "RentalShop", type: "string" },
                { id: "s", label: "Usage", type: "number" }
            ],
            "rows": [

            ]
        };

        $scope.myChartObject.options = {
            title: "Current Usage",
            isStacked: "true",
            fill: 20,
            displayExactValues: true,
            vAxis: {
                title: "Usage Percentage",
                gridlines: {
                    count: 10
                }
            },
            hAxis: {
                title: "Station ID"
            }
        };
        //////////////////////////////

        //History Graph Object
        $scope.myChartObject2 = {
                type: "LineChart",
                displayed: false,
                data: {
                    cols: [

                    ],
                    rows: [

                    ]
                },
                options: {
                    title: "Usage per Minute",
                    isStacked: "true",
                    fill: 20,
                    displayExactValues: true,
                    vAxis: {
                        title: "Usage Percentage",
                        gridlines: {
                            count: 10
                        }
                    },
                    hAxis: {
                        title: "Time Per Minute"
                    }
                },
                formatters: {}
            }
            /////////////////////////////////////


        // Add some markers to the map.
        // Note: The code uses the JavaScript Array.prototype.map() method to
        // create an array of markers based on a given "locations" array.
        // The map() method here has nothing to do with the Google Maps API.

        /** Converts numeric degrees to radians */
        if (typeof(Number.prototype.toRadians) === "undefined") {
            Number.prototype.toRadians = function() {
                return this * Math.PI / 180;
            }
        }


        //fetching data
        var getStaticData = function() {
            var url = "https://gbfs.citibikenyc.com/gbfs/en/station_information.json";
            return $http.get(url);
        };
        var getDynamicBikesData = function() {
            var url = "https://gbfs.citibikenyc.com/gbfs/en/station_status.json";
            return $http.get(url);
        };

        // Fetching dynamic bike usage data on 10 Seconds interval
        function getBikesData() {
            if (seconds == 70) {
                seconds = 0;
            }
            seconds += 10;
            getDynamicBikesData()
                .then(function(response) {
                        if (lastUpdated != response.data.last_updated) { // checking if the data is refreshed
                            lastUpdated = response.data.last_updated
                            var currentGraph = [];
                            $scope.availableBikesData = response.data.data;
                            var percentage;
                            var value;
                            var row = {
                                c: [{
                                        v: timeperminute
                                    },

                                ]
                            }

                            angular.forEach($scope.availableBikesData.stations, function(value, key) {

                                // calculation percentage using hashmap
                                var mark = markerbyStationId.get(value.station_id);
                                var capacity = stationsbyId.get(value.station_id).capacity;
                                percentage = value.num_bikes_available / capacity;
                                if (percentage == 0) {
                                    markerbyStationId.get(value.station_id).icon = redicon;
                                } else if (percentage < 0.5) {
                                    markerbyStationId.get(value.station_id).icon = orangeicon;
                                } else if (percentage > 0.75) {
                                    markerbyStationId.get(value.station_id).icon = greenicon;
                                }

                                //current Usage Graph Data 
                                graphData = {
                                    c: [
                                        { v: value.station_id },
                                        { v: 100 - (percentage * 100) }
                                    ]
                                }
                                currentGraph.push(graphData);
                                //buiding hashmap for usage graph filter
                                currentChartDataByStationId.set(value.station_id, graphData);

                                //History Usage Graph Data // Setting after every minute
                                if (seconds == 10) {
                                    value = {
                                        i: value.station_id,
                                        v: 100 - (percentage * 100),
                                        f: 100 - (percentage * 100) + "% Usage"
                                    }
                                    row.c.push(value);

                                    //saving in hashmap // for history graph filter
                                    if (historyDatabyStationId.has(value.i)) {
                                        var prevDataRow = historyDatabyStationId.get(value.i);
                                        var stationRow = {
                                            c: [{
                                                    v: timeperminute
                                                },

                                            ]
                                        }
                                        stationRow.c.push(value);
                                        prevDataRow.push(stationRow);

                                        historyDatabyStationId.set(value.i, prevDataRow);
                                    } else {
                                        var mainRow = [
                                            stationRow = {
                                                c: [{
                                                        v: timeperminute
                                                    },

                                                ]
                                            }
                                        ];
                                        stationRow.c.push(value);
                                        historyDatabyStationId.set(value.i, mainRow);
                                    }
                                }
                                ////////////


                            });
                            if (currentUsageFilterApplied) {
                                filterCurrentViewOnId(filterStationId);
                            } else {
                                $scope.myChartObject.data.rows = currentGraph;
                            }
                            currentGraphSaved = angular.copy($scope.myChartObject.data.rows);
                            if (!mapFilterApplied) {
                                saveMarkers = angular.copy($scope.markers);
                            }
                            if (seconds == 10) {
                                if (historyUsageFilterApplied) {
                                    filterHistoryViewOnId(filterStationId);
                                    historyGraphSaved.rows.push(row);
                                } else {
                                    $scope.myChartObject2.data.rows.push(row);

                                    historyGraphSaved = angular.copy($scope.myChartObject2.data);
                                }


                                timeperminute++;
                            }
                        }

                        $timeout(function() { getBikesData(); }, 10000) //calling every 10 seconds,  can be changed

                    },
                    function(error) {
                        alert(error);
                    });

        }

        ///getting stations data
        function getData() {
            getStaticData()
                .then(function(response) {
                        $scope.staticData = response.data.data;
                        var marker;
                        angular.forEach($scope.staticData.stations, function(value, key) {
                            //building hashmap for getting stations based on their id 
                            stationsbyId.set(value.station_id, value);
                            marker = { coords: { latitude: value.lat, longitude: value.lon }, id: value.station_id, icon: redicon };
                            $scope.markers.push(marker);

                            //building hashmap for getting markers based on their station id
                            markerbyStationId.set(value.station_id, marker);
                            var column = {
                                id: value.station_id,
                                label: value.name,
                                type: "number",

                            }
                            $scope.myChartObject2.data.cols.push(column);
                        });

                        //mapping for autocomplete control
                        self.stationsforAutocomplete = $scope.staticData.stations.map(function(station) {
                            return {
                                value: station.name.toLowerCase(),
                                display: station.name,
                                id: station.station_id,
                                coords: { latitude: station.lat, longitude: station.lon }
                            };
                        });
                        getBikesData();
                    },
                    function(error) {
                        alert(error);
                    });
        }
        getData(); // loading stations data on page load // required only one time


        //calculates distance between two locations
        function getDistance(loc1, loc2) {

            var R = 6371e3; // metres
            var φ1 = loc1.latitude.toRadians();
            var φ2 = loc2.latitude.toRadians();
            var Δφ = (loc2.latitude - loc1.latitude).toRadians();
            var Δλ = (loc2.longitude - loc1.longitude).toRadians();

            var a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

            var d = R * c;

            return d / 1000;
        }

        //filter markers based on location and distance 
        function filterOnIdDistance(location, distance) {
            var newMarkers = [];
            markerbyStationId.forEach(function(value, key) {
                if (getDistance(location.coords, value.coords) <= distance) {
                    newMarkers.push(value);
                }
            });
            $scope.markers = newMarkers;
        }

        // checks for form validations
        $scope.checkForCustomValidations = function() {
            if ($scope.searchForm.$invalid) {
                angular.forEach($scope.searchForm.$error, function(controls, errorName) {
                    angular.forEach(controls, function(control) {
                        control.$setTouched();
                    });
                });
                return true; //errors found
            }
        }

        //filter for current usage graph based on station
        function filterCurrentViewOnId(id) {

            $scope.myChartObject.data.rows = [];
            $scope.myChartObject.data.rows.push(currentChartDataByStationId.get(id));

        }

        //filter for history usage graph based on station
        function filterHistoryViewOnId(id) {
            $scope.myChartObject2.data.cols = [];
            var column = {
                id: stationsbyId.get(id).station_id,
                label: stationsbyId.get(id).name,
                type: "number",

            }
            $scope.myChartObject2.data.cols.push(column);
            $scope.myChartObject2.data.cols.push(column);
            $scope.myChartObject2.data.rows = historyDatabyStationId.get(id);
        }

        //query function for all the three views
        $scope.queryClicked = function() {
            if ($scope.checkForCustomValidations()) {
                return;
            }
            if ($scope.currentView == '1') { //for map view
                mapFilterApplied = true;
                filterOnIdDistance(self.selectedItem, $scope.distance);
            } else if ($scope.currentView == '2') { //for current usage view
                currentUsageFilterApplied = true;
                filterCurrentViewOnId(self.selectedItem.id);

            } else { //for history usage view
                historyUsageFilterApplied = true;
                filterHistoryViewOnId(self.selectedItem.id);
            }
            filterStationId = self.selectedItem.id; // saving station id on which filter was applied. for update purposes
        }

        //reset validations on form reset
        function resetFormValidations() {
            $timeout(function() {
                angular.forEach($scope.searchForm.$error, function(controls, errorName) {
                    angular.forEach(controls, function(control) {
                        control.$setUntouched();
                        control.$valid = true;
                        control.$invalid = false;
                        control.$dirty = false;
                    });
                });
            }, 100);
        }

        //reset of filters based on station id and also distance in case of maps
        $scope.resetClicked = function() {
            $scope.distance = 3;
            self.selectedItem = null;
            if ($scope.currentView == '1') { // resetting map view
                $scope.markers = angular.copy(saveMarkers);
                mapFilterApplied = false;
            } else if ($scope.currentView == '2') { //resetting usage view
                currentUsageFilterApplied = false;
                $scope.myChartObject.data.rows = angular.copy(currentGraphSaved);
            } else { //resetting history view
                historyUsageFilterApplied = false;
                $scope.myChartObject2.data = historyGraphSaved;

            }
            resetFormValidations();

        }

        //////////////
        //////Autocomplete Settings//////////
        // ******************************
        // Internal methods
        // ******************************

        /**
         * Search for states... use $timeout to simulate
         * remote dataservice call.
         */
        function querySearch(query) {
            var results = query ? self.stationsforAutocomplete.filter(createFilterFor(query)) : self.stationsforAutocomplete;
            var deferred = $q.defer();
            $timeout(function() { deferred.resolve(results); }, Math.random() * 1000, false);
            return deferred.promise;
        }

        /**
         * Create filter function for a query string
         */
        function createFilterFor(query) {
            var lowercaseQuery = angular.lowercase(query);

            return function filterFn(stationsforAutocomplete) {
                var index = stationsforAutocomplete.value.indexOf(lowercaseQuery);
                return (index === 0);
            };

        }


        ////autocomplete ends here////

    });