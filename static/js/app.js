var app = angular.module("cal", ["ngStorage"]);


function MainCtrl($scope, $localStorage){
    $scope.$storage = $localStorage.$default({startDate:null, calId:null, calSummary:null, dateIsSet:false});
    $scope.calKey = "Balance";
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
        $scope.$storage.calId = cal.id;
        $scope.$storage.calSummary = cal.summary;
        $scope.calSelector = false;
        $scope.$apply();
    }

    $scope.getEvents = function(){
        var date = new Date($scope.$storage.startDate);
        var prevD = new Date(date.getTime() + (-1 * 24 * 60 * 60 * 1000))
        var bal;
        var val;
        
        $scope.events = [];
        gapi.client.load('calendar', 'v3', function() {
            console.log(prevD.toISOString())
            var request = gapi.client.calendar.events.list({
                'calendarId': $scope.$storage.calId,
                'orderBy':'startTime',
                'singleEvents':true,
                'timeMax': prevD.toISOString()
            });
            request.execute(function(resp){
                if(resp.hasOwnProperty("items")){
                    $scope.sBalance = $scope.parseValue(resp.items[0].summary).num;
                    $scope.rBalance = $scope.sBalance; // always reset running balance
                    angular.forEach(resp.items, function(item, i){
                        // starting balance is always [0]
                        if(i>0){
                            val = $scope.parseValue(item.summary); // parse the value for this event
                            if(val.op == "-"){
                                bal = $scope.rBalance - val.num;
                            }else if(val.op == "+"){
                                bal = $scope.rBalance + val.num;
                            }          
                            
                            $scope.events.push({
                                summary:item.summary,
                                date:$scope.getDate(item),
                                balance:bal
                            });

                            $scope.rBalance = bal;
                        }
                    });

                    console.log($scope.events);
                }else{
                 
                    console.log("No Events");
                }
            });
         });
    }

    $scope.setDate = function(){
        //TODO validate
        $scope.$storage.dateIsSet = true;
        $scope.getEvents();
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
                if($scope.$storage.startDate != null){
                    $scope.getEvents();
                }
            }
            
        });
    }

}
