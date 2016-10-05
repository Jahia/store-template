<%@ taglib prefix="jcr" uri="http://www.jahia.org/tags/jcr" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="utility" uri="http://www.jahia.org/tags/utilityLib" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="functions" uri="http://www.jahia.org/tags/functions" %>
<%@ taglib prefix="user" uri="http://www.jahia.org/tags/user" %>
<%@ taglib prefix="query" uri="http://www.jahia.org/tags/queryLib" %>
<%--@elvariable id="currentNode" type="org.jahia.services.content.JCRNodeWrapper"--%>
<%--@elvariable id="out" type="java.io.PrintWriter"--%>
<%--@elvariable id="script" type="org.jahia.services.render.scripting.Script"--%>
<%--@elvariable id="scriptInfo" type="java.lang.String"--%>
<%--@elvariable id="workspace" type="java.lang.String"--%>
<%--@elvariable id="renderContext" type="org.jahia.services.render.RenderContext"--%>
<%--@elvariable id="currentResource" type="org.jahia.services.render.Resource"--%>
<%--@elvariable id="currentUser" type="org.jahia.services.usermanager.JahiaUser"--%>
<%--@elvariable id="url" type="org.jahia.services.render.URLGenerator"--%>

<template:addResources type="css" resources="libraries/fileinput.min.css"/>
<template:addResources type="javascript" resources="libraries/fileinput/plugins/canvas-to-blob.min.js,
                                                    libraries/fileinput/plugins/sortable.min.js,
                                                    libraries/fileinput/plugins/purify.min.js,
                                                    libraries/fileinput/fileinput.js,
                                                    libraries/fileinput/themes/fa/theme.js,
                                                    libraries/fileinput/locales/${renderContext.mainResourceLocale}.js
                                                    "/>

<template:addResources type="css" resources="appStore.css"/>

<c:set var="id" value="${currentNode.identifier}"/>
<c:set var="isDeveloper" value="${jcr:hasPermission(currentNode, 'jcr:write')}"/>

<c:if test="${isDeveloper}">
    <c:set var="viewAsUser" value="${not empty param['viewAs'] && param['viewAs'] eq 'user'}"/>
</c:if>

<template:include view="hidden.header"/>
<c:set var="columnsNumber" value="4"/>
<template:addResources type="inlinejavascript">
    <script type="text/javascript">
        var newPictures = {};
        $(document).ready(function() {
            //Sort pictures functions
            $(function () {
                $(".grid").sortable({
                    tolerance: 'pointer',
                    revert: 'invalid',
                    placeholder: 'col-xs-2 well placeholder',
                    forceHelperSize: true
                });
            });
            $('.grid').on('sortstop', function(event, ui) {

                var movedScreenshot = $(ui.item[0]);
                var folder = movedScreenshot.attr("data-parent-path");

                var data = {};
                data['source'] = folder + "/" + movedScreenshot.attr("data-name");

                if (movedScreenshot.is(':last-child')) {
                    data['target'] = folder;
                    data['action'] = "moveAfter";
                }
                else {
                    data['target'] = folder + "/" + movedScreenshot.next().attr("data-name");
                    data['action'] = "moveBefore";
                }
                console.log("move screenshot");
                $.post('<c:url value="${url.base}${currentNode.path}.move.do"/>', data, function () {

                }, "json");

            });
            //Remove picture functions
            $('.remove-screenshot').click(function() {
                removePicture(this);
            });

            $('#moduleScreenshotsList, #moduleScreenshotsList li').disableSelection();

        });
        function removePicture(object){
            var listItem = $(object).parent('.moduleScreenshot');
            $.post($(object).attr('data-path'), {jcrMethodToCall: 'delete'}, function() {
                listItem.fadeOut('slow', function() {listItem.remove()});
            }, "json");
        }

        //Form upload and UI update
        function formSubmit(){
            //Get form pictures
            var data = new FormData();
            $.each($('#file_upload_${currentNode.identifier}')[0].files, function(i, file) {
                data.append('file'+i, file);
            });
            //Add JCR Creation information
            data['jcrNodeType']="jnt:file";
            data['jcrReturnContentType']='json';
            data['jcrReturnContentTypeOverride']='application/json; charset=UTF-8';
            data['jcrNewNodeOutputFormat']='${renderContext.mainResource.template}.html';
            data['form-token']=$('#file_upload_form_${currentNode.identifier} input[name=form-token]').val();
            //Remove previews and put loading gif instead
            <c:url value='${url.currentModule}/img/loading.gif' var="loadingURL"/>
            $(".file-preview").empty();
            $(".file-preview").append('<img class="pull-center" src="${loadingURL}" style="margin-left:50%"/>');
            //Send pictures to server for node creation
            $.ajax({
                url: '<c:url value="${url.base}${currentNode.path}"/>',
                data: data,
                cache: false,
                contentType: false,
                processData: false,
                type: 'POST',
                success: function(data){
                    var jsonData = $.parseJSON(data);
                    //For each created node
                    $.each(jsonData['urls'],function(index,object){
                        //Split path in order to isolate picture name
                        var pathSections = object.split("/");
                        //Create pictures div in pictures list to be able to sort them
                        var newDiv = '<div class="well col-xs-3 tile moduleScreenshot" data-name="'+pathSections[pathSections.length - 1]+'" data-parent-path="${currentNode.path}">';
                        newDiv += '<img class="move-screenshot col-xs-6 img-responsive pull-left" src="'+object+'?t=thumbnail2"/>';
                        newDiv += '<a class="remove-screenshot" data-path="'+object.replace("files/live/","")+'" href="#" onclick="removePicture(this)">';
                        newDiv += '<i class="glyphicon glyphicon-remove"></i>&nbsp;<fmt:message key="jnt_forgeEntry.label.remove"/>';
                        newDiv += '</a>';
                        newDiv += '</div>';
                        //Remove loading div and display newly created pictures
                        $('.file-preview').fadeOut('slow',function(){
                            $(".grid").append(newDiv).fadeIn('slow');
                        });

                    });
                    //Reset Form
                    $("#file_upload_form_${currentNode.identifier}")[0].reset();
                    return false;
                }
            });
            return false;
        }
    </script>
</template:addResources>
<c:url value='${url.base}${currentNode.path}' var="postURL"/>
<template:tokenizedForm>
    <div id="fileUploadFormRow" class="row col-xs-12">
        <form class="file_upload" id="file_upload_form_${currentNode.identifier}"
              action="${postURL}" method="POST" enctype="multipart/form-data" onsubmit="return formSubmit()">
            <input id="file_upload_${currentNode.identifier}" type="file" class="file" data-preview-file-type="text" multiple/>
        </form>
    </div>
</template:tokenizedForm>
<div id="fileListRow" class="row grid col-xs-12">
    <c:forEach var="moduleScreenshot" items="${moduleMap.currentList}" varStatus="status">
        <div class="well col-xs-3 tile moduleScreenshot" data-name="${moduleScreenshot.name}" data-parent-path="${moduleScreenshot.parent.path}">
            <img class="move-screenshot col-xs-6 img-responsive pull-left" src="${moduleScreenshot.thumbnailUrls['thumbnail2']}"/>
            <a class="remove-screenshot" data-path="<c:url value='${url.base}${moduleScreenshot.path}'/>"
               href="#"><i class="glyphicon glyphicon-remove"></i>&nbsp;<fmt:message key="jnt_forgeEntry.label.remove"/></a>
        </div>
    </c:forEach>
</div>