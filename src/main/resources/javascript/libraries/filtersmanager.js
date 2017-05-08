function FiltersManager() {
    this.CATEGORIES = 'categories';
    this.TAGS = 'tags';

    var filtersContainer = {
        categories: [],
        tags: []
    };

    this.containsValue = function(filterType, value) {
        return _.find(filtersContainer[filterType], findValue(value));
    };

    this.isEmpty = function(filterType) {
        return filtersContainer[filterType].length == 0;
    };

    this.addValue = function(filterType, value) {
        filtersContainer[filterType].push(value);
    };

    this.removeValue = function(filterType, value) {
        for(var i = 0; i < filtersContainer[filterType].length > 0; i++) {
            if (filtersContainer[filterType][i] == value) {
                filtersContainer[filterType].splice(i, 1);
                return true;
            }
        }
        return false;
    };

    this.resetFilter = function(filterType) {
        filtersContainer[filterType] = [];
    };

    function findValue(selectedValue) {
        return function(value) {
            return value == selectedValue;
        }
    }
}