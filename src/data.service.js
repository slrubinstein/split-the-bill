angular.module('ionic-app')
	.factory('dataService', dataService);

function dataService($http, apiEndpoint) {

	return {
		getItems: getItems,
		createItem: createItem
	}

	function getItems() {
		return $http.get(apiEndpoint.url + '/api/items');
	}

	function createItem(item) {
		return $http.post(apiEndpoint.url + '/api/items', item);
	}
}