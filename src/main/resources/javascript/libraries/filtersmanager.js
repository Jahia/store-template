function FiltersManager() {
    this.CATEGORIES = 'categories';
    this.TAGS = 'tags';

    var $isotope = null;
    var filtersContainer = {
        categories: [],
        tags: []
    };

    this.initializeIsotope = function(instance) {
        $isotope = instance;
    };
    // init Isotope

    this.filterItems = function(filters) {
        var filterValues = "";

        for(var i = 0; i < filters.length; i++) {
            var filterTypeValues = filtersContainer[filters[i]];

            if (filterTypeValues != null) {
               filterValues += ' [data-filter-' + filters[i] + '*="' + filterTypeValues.join('"], [data-filter-' + filters[i] + '*="') + '"]';
            }
        }
        if (_.isEmpty(filterValues)) {
            filterValues = true;
        }
        $isotope.isotope({ filter: filterValues });
    };

    this.containsValue = function(filterType, value) {
        return _.find(filtersContainer[filterType], findValue(value));
    };

    this.isEmpty = function(filterType) {
        return filtersContainer[filterType].length == 0;
    };

    this.getFilterContainerSize = function(filterType) {
        return filtersContainer[filterType].length;
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

    this.getFilterTypeElementCount = function (filterType, additionalFilters) {
        var elements = $isotope.isotope('getFilteredItemElements');
        var filterTypeElementCount = {};
        var availableFilters = filtersContainer[filterType].join(" ");
        if (additionalFilters != null) {
            //Used to include any other filters that may otherwise be omitted
            availableFilters += " " + additionalFilters.join(" ");
        }
        _.each(elements, function(element){
            var elementCategories = $(element).attr('data-filter-categories').split(' ');
            _.each(elementCategories, function(filterId){
                if (availableFilters.indexOf(filterId) == -1) {
                    //skip the filter if it isn't after of this filter set
                    return;
                }
                filterTypeElementCount[filterId] = !(filterId in filterTypeElementCount) ? 1 : filterTypeElementCount[filterId] + 1;
            });
        });
        return filterTypeElementCount;
    };

    function findValue(selectedValue) {
        return function(value) {
            return value == selectedValue;
        }
    }
}