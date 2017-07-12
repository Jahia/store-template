function FiltersManager() {
    var self = this;
    self.CATEGORIES = 'categories';
    self.TAGS = 'tags';
    self.QUICKSEARCH = 'quicksearch';
    self.STATUS = 'status';

    var $isotope = null;
    var filtersContainer = {};
    filtersContainer[self.CATEGORIES] = [];
    filtersContainer[self.TAGS] = [];
    filtersContainer[self.QUICKSEARCH] = [];
    filtersContainer[self.STATUS] = [];

    self.initializeIsotope = function(instance) {
        $isotope = instance;
    };

    self.filterItems = function(filters) {
        var filterValues = {};
        //If filters is not provided, filter over all available filter types
        if (_.isEmpty(filters)) {
           filters = _.keys(filtersContainer);
        }

        for(var i = 0; i < filters.length; i++) {
            if (!_.isEmpty(filtersContainer[filters[i]])) {
               filterValues[filters[i]] = filtersContainer[filters[i]].join("|");
            }
        }
        //If all filters are empty then don't filter the items
        _.each($isotope, function(grid){
            $(grid).isotope({
                filter: function () {
                    var filterResults = {};
                    //Currently all filters evaluated as an `AND` operator
                    if (!_.isEmpty(filterValues[self.QUICKSEARCH])) {
                        filterResults[self.QUICKSEARCH] = $(this).text().match(new RegExp(filterValues[self.QUICKSEARCH], 'gi')) != null;
                    }
                    if (!_.isEmpty(filterValues[self.CATEGORIES])) {
                        filterResults[self.CATEGORIES] = $(this).attr("data-filter-" + self.CATEGORIES).match(new RegExp(filterValues[self.CATEGORIES], 'gi')) != null;
                    }
                    if (!_.isEmpty(filterValues[self.TAGS])) {
                        filterResults[self.TAGS] = $(this).attr("data-filter-" + self.TAGS).match(new RegExp(filterValues[self.TAGS], 'gi')) != null;
                    }
                    if (!_.isEmpty(filterValues[self.STATUS])) {
                        filterResults[self.STATUS] = $(this).attr("data-filter-" + self.STATUS).match(new RegExp(filterValues[self.STATUS], 'gi')) != null;
                    }
                    filterResults = _.values(filterResults).join(" ");
                    var show = filterResults.indexOf('false') == -1;
                    $(this).attr('data-filter-element', show ? "show" : "hide");
                    return show;
                }
            });
        });
    };

    self.containsValue = function(filterType, value) {
        return _.find(filtersContainer[filterType], findValue(value));
    };

    self.isEmpty = function(filterType) {
        return filtersContainer[filterType].length == 0;
    };

    self.getFilterContainerSize = function(filterType) {
        return filtersContainer[filterType].length;
    };

    self.addValue = function(filterType, value) {
        filtersContainer[filterType].push(value);
    };

    self.removeValue = function(filterType, value) {
        for(var i = 0; i < filtersContainer[filterType].length; i++) {
            if (filtersContainer[filterType][i] == value) {
                filtersContainer[filterType].splice(i, 1);
                return true;
            }
        }
        return false;
    };

    self.resetFilter = function(filterType) {
        filtersContainer[filterType] = [];
    };

    self.getFilterTypeElementCount = function (filterType) {
        var filterTypeElementCount = {};
        var availableFilters = filtersContainer[filterType].join(" ");

        _.each($isotope, function(grid){
            var elements = $(grid).isotope('getFilteredItemElements');
            _.each(elements, function(element){
                var elementFilterValues = $(element).attr('data-filter-' + filterType).split(' ');
                _.each(elementFilterValues, function(filterId){
                    if (availableFilters.indexOf(filterId) == -1) {
                        //skip the filter if it isn't after of this filter set
                        return;
                    }
                    filterTypeElementCount[filterId] = !(filterId in filterTypeElementCount) ? 1 : filterTypeElementCount[filterId] + 1;
                });
            });
        });
        return filterTypeElementCount;
    };

    self.getTotalFilteredElementCount = function() {
        var totalElementsCount = 0;
        _.each($isotope, function(grid){
            totalElementsCount += $(grid).isotope('getFilteredItemElements').length;
        });
        return totalElementsCount;
    };

    function findValue(selectedValue) {
        return function(value) {
            return value == selectedValue;
        }
    }
}