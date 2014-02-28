var app = angular.module("cal", ["ngStorage"]);


function MainCtrl($scope, $localStorage){
    $scope.$storage = $localStorage.$default({startDate:null, calId:null, calSummary:null, dateIsSet:false, sBalance:null});
    $scope.authenticated = false;
    $scope.startDate = "1/1/2014";
    $scope.cals = [];
    $scope.calId;

    $scope.authenticate = function(callback){
        var config = {
            'client_id': '457161246465-ttk9ko9oqe386d81uaga13n744mec3h0.apps.googleusercontent.com',
            'scope': 'https://www.googleapis.com/auth/calendar'
        };

        gapi.auth.authorize(config, function() {
            $scope.authenticated = true;
            $scope.token = gapi.auth.getToken();
            $scope.$apply();
            callback();
        });
        
    }

    $scope.getCalendars = function(){
        $scope.calSelector = true;
        gapi.client.load('calendar', 'v3', function() {
            var request = gapi.client.calendar.calendarList.list();
            request.execute(function(resp){
                // we got to find the right cal
                
                angular.forEach(resp.items, function(item){
                    $scope.cals.push({'summary':item.summary, 'id':item.id});
                });
                $scope.$apply()
            });
            
        });
    }
    
    $scope.setCal = function(event, cal){
        event.preventDefault();
        if(cal.id != $scope.$storage.calId){
            $scope.$storage.calId = cal.id;
            $scope.$storage.calSummary = cal.summary;
        }
        $scope.calSelector = false;
        //$scope.$apply();
    }

    $scope.getEvents = function(){
        var date = new Date($scope.$storage.startDate);
        var prevD = new Date(date.getTime() + (-1 * 24 * 60 * 60 * 1000))
        var bal;
        var val;
        
        $scope.events = [];
        gapi.client.load('calendar', 'v3', function() {
            var request = gapi.client.calendar.events.list({
                'calendarId': $scope.$storage.calId,
                'orderBy':'startTime',
                'singleEvents':true,
                'timeMin': prevD.toISOString()
            });
            request.execute(function(resp){
                if(resp.hasOwnProperty("items")){
                    //$scope.sBalance = $scope.parseValue(resp.items[0].summary).num;
                    $scope.rBalance = $scope.$storage.sBalance; // always reset running balance
                    angular.forEach(resp.items, function(item, i){
                        // starting balance is always [0]
                        val = $scope.parseValue(item.summary); // parse the value for this event
                        if(val != null){
                            if(val.op == "-"){
                                bal = $scope.rBalance - val.num;
                            }else if(val.op == "+"){
                                bal = $scope.rBalance + val.num;
                            }          
                            if(val.op != null){
                                var rawDate = $scope.getDate(item);
                                var parsedDate =  d3.time.format("%Y-%m-%d").parse(rawDate);

                                $scope.events.push({
                                    summary:item.summary,
                                    date: parsedDate,
                                    balance:bal,
                                    fDate:parsedDate.toLocaleDateString()

                                });

                                $scope.rBalance = bal;
                            }
                        }
                    });
                    $scope.$apply();
                    // also draw the chart;
                    $scope.updateChart();

                }else{
                    console.log("No Events");
                }
            });
         });
    }

    $scope.updateChart = function(){
        var c = document.getElementById("chart-wrap");
        var s = document.getElementsByTagName("svg");
        try{
            c.removeChild(s[0]);
        }catch(e){
            //..
        }
        var margin = {top: 20, right: 20, bottom: 20, left: 50},
        width = c.scrollWidth - margin.left - margin.right,
        height = c.scrollHeight - margin.top - margin.bottom;

        var d3parseDate = d3.time.format("%Y-%m-%d").parse;
        
        var x = d3.time.scale()
            .range([0, width]);

        var y = d3.scale.linear()
            .range([height, 0]);

        var xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom")
            .ticks(10);

        var yAxis = d3.svg.axis()
            .scale(y)
            .orient("left")
            .ticks(10);

        var line = d3.svg.line()
            .x(function(d) { return x(d.date); })
            .y(function(d) { return y(d.balance); });

        var svg = d3.select("#chart-wrap").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
            
        var data = $scope.events.slice(0);
        // we always have to prepend the start date/balance
        var sDateParsed = d3parseDate($scope.$storage.startDate); // parsed start date
        data.unshift({
            date: sDateParsed,
            balance: $scope.$storage.sBalance,
            summary : "Starting Balance",
            fDate: sDateParsed.toLocaleDateString()
            
        })
        data.forEach(function(d) {
            d.balance = +d.balance;
        });

        x.domain(d3.extent(data, function(d) { return d.date; }));
        y.domain(d3.extent(data, function(d) { return d.balance; }));

        svg.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + height + ")")
          .call(xAxis
                .tickSize(-height, 0, 0)
           );

        svg.append("g")
          .attr("class", "y axis")
          .call(yAxis
            .tickSize(-width, 0, 0)
           )

          .append("text")
          .attr("transform", "rotate(-90)")
          .attr("y", 6)
          .attr("dy", ".71em")
          .style("text-anchor", "end")
          .text("Balance($)");

        svg.append("path")
          .datum(data)
          .attr("class", "line")
          .attr("d", function(d){
                    var l = line(d);
                    return l;
          });


        var circs = svg.selectAll("circle")
            .data(data)
            .enter()
            .append("circle")
            .attr("r", 5)
            .style("fill", function(d) { return "#C93D75"})
            .attr("cx", function(d){
                return x(d.date);
            })
            .attr("cy", function(d){
                return y(d.balance);
            })
            .append("svg:title")
            .text(function(d){
                return "D: " +  d.summary  + "\nB: $" + d.balance ;   
            })

    }

    $scope.setDate = function(){
        //TODO validate
        if($scope.$storage.sBalance != null && $scope.$storage.sBalance != ""){
            $scope.$storage.dateIsSet = true;
            $scope.getEvents();
            $scope.edit = false;
        }
    }

    $scope.parseValue = function(valueStr){
        /*Parse a item summary
         * We are expecting a string formated like this -$1000.00 -- <operator> $ 1000
         * 
         * */
        // First find the number in the string
        valueStr = valueStr.replace(/[a-zA-Z?><\s$]/g,"");
        var nums = valueStr.match(/[0-9.]+/g);
        var ops = valueStr.match(/[\-\+]/);
        try{
            if(nums.length > 0){
                num = parseFloat(nums[0]);
            }else{
                num = 0.00;
            }
            if(ops!=null){
                if(ops.length > 0){
                    op = ops[0]; 
                }else{
                    op = null;
                }
            }else{
                op = null;
            }
            return {'op':op, 'num':num};
        }catch(e){
            //.. could not parse
            return null
        }
    }
    
    $scope.getDate = function(item){
        var date;
        if(!angular.isUndefined(item.start.date)){
            date = item.start.date;
        }else if(!angular.isUndefined(item.start.dateTime)){
            date = item.start.dateTime;
        }else if(!angular.isUndefined(item.end.date)){
            date = item.end.dateTime;
        }else if(!angular.isUndefined(item.end.dateTime)){
            date = item.end.dateTime;
        }
        return date;
    };

    $scope.init = function(){
        $scope.authenticate(function(){
            if($scope.$storage.calId == null){
                $scope.calSelector = true;
                $scope.getCalendars();
            }else{
                $scope.calSelector = false;
                if($scope.$storage.dateIsSet){
                    $scope.getEvents();
                }
            }
            
        });
    }

}
