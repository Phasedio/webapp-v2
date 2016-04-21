'use strict';

(function() {

class MainController {

  constructor($http, $scope, Phased) {
    this.$http = $http;
    this.awesomeThings = [];
    $scope.Phased = this.Phased = Phased;
  }

  $onInit() {
    this.$http.get('/api/things').then(response => {
      this.awesomeThings = response.data;
    });
    console.log(this.Phased);
  }
}

angular.module('webappV2App')
  .component('main', {
    templateUrl: 'app/main/main.html',
    controller: MainController
  });

})();
