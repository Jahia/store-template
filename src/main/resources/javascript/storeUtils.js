var contains = function(needle) {
    // Per spec, the way to identify NaN is that it is not equal to itself
    var findNaN = needle !== needle;
    var indexOf;

    if(!findNaN && typeof Array.prototype.indexOf === 'function') {
        indexOf = Array.prototype.indexOf;
    } else {
        indexOf = function(needle) {
            var i = -1, index = -1;

            for(i = 0; i < this.length; i++) {
                var item = this[i];

                if((findNaN && item !== item) || item === needle) {
                    index = i;
                    break;
                }
            }

            return index;
        };
    }

    return indexOf.call(this, needle) > -1;
};

/**
 * This function get the categories table sorted for the categories filter initialization
 * @param modulesCategories
 * @returns {Array} : String array containing tags strings
 */
function getSortedTags(modulesTags){
    var tags = [];
    $.each(modulesTags, function(moduleId,moduleTags){
        for(var index=0; index<moduleTags.length;index++){
            $("#module-"+moduleId).addClass("tag-"+moduleTags[index]);
            if(!contains.call(tags,moduleTags[index])){
                tags.push(moduleTags[index]);
            }
        }
    });
    //Sort tags list for filter selector
    tags.sort();
    return tags;
}

/**
 * This function get the categories table sorted for the categories filter initialization
 * @param modulesCategories
 * @returns {Array} : String array containing each category under the following format <categoryTitle>--categoryID--<categoryId>
 */
function getSortedCategories(modulesCategories){
    var categories = [];
    $.each(modulesCategories, function(categoryTitle,categoryId){
        if(!contains.call(categories,categoryTitle)){
            categories.push(categoryTitle+"--categoryID--"+categoryId);
        }
    });
    //Sort categories list for filter selector
    categories.sort();
    return categories;
}

function moduleDoAddReview(modulePath, form) {

    $.post(modulePath+".addReview.do", form.serialize(), function(result) {

        if (result['moduleUrl'] != "")
            window.location = result['moduleUrl'];

    }, "json");
}

jahiaAPIStandardCall(context, "default", locale, "nodes", nodeIdentifier, "PUT", jsonString, ajaxReloadCallback, formError);


/**
 * This function make an ajax call to the Jahia API and return the result of this call
 * @param urlContext
 * @param workspace
 * @param locale
 * @param way
 * @param endOfURI
 * @param method
 * @param json
 * @param callback
 * @param errorCallback
 * @returns {*}
 */
function jahiaAPIStandardCall(urlContext, workspace, locale, way, endOfURI, method, json, callback, errorCallback) {
    var callResult;
    var url = urlContext + "/" + API_URL_START + "/" + workspace + "/" + locale + "/" + way + (way=="paths"?"":"/") + endOfURI;
    var httpResult = $.ajax({
        contentType: 'application/json',
        data: json,
        dataType: 'json',
        processData: false,
        type: method,
        url: url,
        success: function (result) {
            result["status"] = httpResult.status;
            //calling the callback
            if (!(callback === undefined)) {
                callback(result, json);
            }
            callResult = result;
        },
        error: function (result) {
            result["status"] = httpResult.status;
            return errorCallback(result, json);

        }
    });

    return callResult;
}

/**
 * @Author : Jahia(rahmed)
 * This function make a JSON Post of ckeditor contained in a Row
 * It also defines the error message div css class for the error callback
 * The div has to be defined following the pattern : <ID>Field
 * @param rowId: the Id of the from which post the form entries
 * @param nodeIdentifier : the endofURI for the Jahia API Standard Call
 * @param locale : the locale for the Jahia API Standard Call
 * @param callback : the callback function for the Jahia API Standard Call
 * @param errorCallback : the error callback function for the Jahia API Standard Call
 */
function saveCkEditorChanges(editor, rowId, nodeIdentifier, locale, callback, errorCallback) {

    //Opening the JSON
    var jsonPropTable = {};
    var jsonTable = {};


    var editorValue = editor.getData().trim();

    jsonPropTable[rowId] = {"value": editorValue};

    jsonTable["properties"] = jsonPropTable;

    //calling ajax POST
    var myJSONText = JSON.stringify(jsonTable);
    currentCssClass = rowId + "Field";

    //Calling the Jahia Restful API to Update the node
    jahiaAPIStandardCall(context, "live", locale, "nodes", nodeIdentifier, "PUT", myJSONText, callback, errorCallback);
}

function switchDiv(id){
    var div= $("#"+id);
    var textDiv = div.find(".original_text");
    var editableDiv = div.find(".editable_text");
    textDiv.toggleClass( "hide" );
    editableDiv.toggleClass( "hide" );
}
function submitText(id, divToSwitch, textClass, ckeditor){
    if(ckeditor){
        //getting the ckeditors
        var editorId = id + "_editor";
        var editor = CKEDITOR.instances[editorId];
        saveCkEditorChanges(editor, id, nodeId, currentLocale, function(a,b){
            var texttag = $("."+textClass);
            texttag.empty();
            texttag.html(editor.getData().trim());
            switchDiv(divToSwitch);
        }, function(a,b){
        });
    }
    else{
        //Opening the JSON
        var jsonPropTable = {};
        var jsonTable = {};
        jsonPropTable[id] = {"value": $('#'+id).val()};

        jsonTable["properties"] = jsonPropTable;

        //calling ajax POST
        var myJSONText = JSON.stringify(jsonTable);
        //Calling the Jahia Restful API to Update the node
        jahiaAPIStandardCall(context, "live", currentLocale, "nodes", nodeId, "PUT", myJSONText, function(a,b){
            switchDiv(divToSwitch);
        }, function(a,b){
            switchDiv(divToSwitch);
        });

    }
}