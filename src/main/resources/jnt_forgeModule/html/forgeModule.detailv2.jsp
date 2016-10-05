<%@ page import="java.util.Calendar" %>
<%@ taglib prefix="jcr" uri="http://www.jahia.org/tags/jcr" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="utility" uri="http://www.jahia.org/tags/utilityLib" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%@ taglib prefix="uiComponents" uri="http://www.jahia.org/tags/uiComponentsLib" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="functions" uri="http://www.jahia.org/tags/functions" %>
<%@ taglib prefix="user" uri="http://www.jahia.org/tags/user" %>
<%@ taglib prefix="query" uri="http://www.jahia.org/tags/queryLib" %>
<%@ taglib prefix="forge" uri="http://www.jahia.org/modules/forge/tags" %>
<%--@elvariable id="currentNode" type="org.jahia.services.content.JCRNodeWrapper"--%>
<%--@elvariable id="out" type="java.io.PrintWriter"--%>
<%--@elvariable id="script" type="org.jahia.services.render.scripting.Script"--%>
<%--@elvariable id="scriptInfo" type="java.lang.String"--%>
<%--@elvariable id="workspace" type="java.lang.String"--%>
<%--@elvariable id="renderContext" type="org.jahia.services.render.RenderContext"--%>
<%--@elvariable id="currentResource" type="org.jahia.services.render.Resource"--%>
<%--@elvariable id="currentUser" type="org.jahia.services.usermanager.JahiaUser"--%>
<%--@elvariable id="url" type="org.jahia.services.render.URLGenerator"--%>
<%@include file="header.jspf"%>
<template:addResources type="css" resources="libraries/star-rating.min.css, jquery-ui.smoothness.css"/>
<template:addResources type="css" resources="libraries/bootstrap3-wysihtml5.min.css,
                                             libraries/bootstrap-editable.css,
                                             libraries/jqtree.css,
                                             libraries/select2.css,
                                             libraries/select2.bootstrap.css"/>
<template:addResources type="css" resources="libraries/fileinput.min.css"/>
<template:addResources type="javascript" resources="jquery.min.js"/>
<template:addResources type="javascript" resources="ckeditor.js, jquery.validate.js"/>
<template:addResources type="javascript" resources="libraries/jquery-ui.min.js,
                                                    libraries/select2.js,
                                                    libraries/bootstrap-editable.min.js,
                                                    libraries/star-rating.min.js,
                                                    libraries/locales/${renderContext.mainResourceLocale}.js"/>

<template:addResources type="javascript" resources="libraries/fileinput/plugins/canvas-to-blob.min.js,
                                                    libraries/fileinput/plugins/sortable.min.js,
                                                    libraries/fileinput/plugins/purify.min.js,
                                                    libraries/fileinput/fileinput.min.js,
                                                    libraries/fileinput/themes/fa/theme.js,
                                                    libraries/fileinput/locales/${renderContext.mainResourceLocale}.js
                                                    "/>
<template:addResources type="javascript" resources="storeUtils.js"/>
<template:addResources type="css" resources="appStore.css"/>
<template:addCacheDependency flushOnPathMatchingRegexp="${currentNode.path}/.*"/>
<jcr:sql
        var="query"
        sql="SELECT * FROM [jnt:forgeModuleVersion] AS moduleVersion
            WHERE isdescendantnode(moduleVersion,['${currentNode.path}'])"
/>
<c:set var="sortedModules" value="${forge:sortByVersion(query.nodes)}"/>
<c:set target="${moduleMap}" property="latestVersion" value="${forge:latestVersion(sortedModules)}" />
<template:include view="hidden.sql">
    <template:param name="getLatestVersion" value="true"/>
</template:include>
<c:set value="${moduleMap.latestVersion}" var="latestVersion"/>
<jcr:nodeProperty node="${latestVersion}" name="relatedJahiaVersion" var="requiredVersion"/>
<c:set target="${moduleMap}" property="previousVersions" value="${forge:previousVersions(sortedModules)}" />
<c:set target="${moduleMap}" property="nextVersions" value="${forge:nextVersions(sortedModules)}" />

<c:set var="authorEmail" value="${currentNode.properties['authorEmail'].string}"/>
<c:set var="authorUsername" value="${currentNode.properties['jcr:createdBy'].string}"/>
<c:set var="author" value="${user:lookupUser(authorUsername)}"/>
<c:set var="authorURL" value="${currentNode.properties['authorURL'].string}"/>
<c:set var="userEmail" value="${author.properties['j:email']}"/>
<c:url var="postURL" value="${url.base}${currentNode.path}"/>
<c:set var="howToInstall" value="${currentNode.properties['howToInstall'].string}"/>
<c:set var="id" value="${currentNode.identifier}"/>
<c:set var="isForgeAdmin" value="${jcr:hasPermission(renderContext.site, 'jahiaForgeModerateModule')}"/>
<c:set var="title" value="${currentNode.properties['jcr:title'].string}"/>
<c:set var="isDeveloper" value="${jcr:hasPermission(currentNode, 'jcr:write')}"/>
<c:if test="${isDeveloper}">
    <c:set var="viewAsUser" value="${not empty param['viewAs'] && param['viewAs'] eq 'user'}" />
</c:if>

<c:set var="worstRating" value="1"/>
<c:set var="bestRating" value="5"/>
<c:set var="ratingNbr" value="${fn:length(jcr:getNodes(currentNode, 'jnt:review'))}"/>
<jcr:node var="reviews" path="${currentNode.path}/reviews"/>
<c:set var="entireRating" value="0"/>
<c:if test="${reviews != null}">
    <c:set var="ratingTotal" value="0"/>
    <c:set var="ratingCount" value="0"/>
    <c:forEach var="review" items="${reviews.nodes}">
        <c:set var="ratingCount" value="${ratingCount+1}"/>
        <c:set var="ratingTotal" value="${ratingTotal+review.properties['rating'].long}"/>
    </c:forEach>
    <c:if test="${ratingCount > 0}">
        <c:set var="averageRating" value="${fn:replace(ratingTotal/ratingCount,',','.')}"/>
        <c:set var="splittedAverage" value="${fn:split(averageRating, '.')}"/>
        <c:set var="entireRating" value="${splittedAverage[0]}"/>
        <c:if test="${fn:length(splittedAverage)>1}">
            <c:set var="firstDigit" value="${fn:substring(splittedAverage[1],0,1)}"/>
            <c:if test="${firstDigit ge 5}">
                <c:set var="entireRating" value="${entireRating+1}"/>
            </c:if>
        </c:if>
    </c:if>
</c:if>

<c:set var="hasVideoNode" value="${jcr:hasChildrenOfType(currentNode, 'jnt:videostreaming')}"/>
<c:if test="${hasVideoNode}">
    <jcr:node var="videoNode" path="${currentNode.path}/video"/>
    <c:set var="videoProvider" value="${videoNode.properties['provider'].string}"/>
    <c:set var="videoIdentifier" value="${videoNode.properties['identifier'].string}"/>
    <c:set var="videoHeight" value="${videoNode.properties['height'].string}"/>
    <c:set var="videoWidth" value="${videoNode.properties['width'].string}"/>
    <c:set var="videoAllowfullscreen" value="${videoNode.properties['allowfullscreen'].string}"/>
</c:if>


<jcr:node var="screenshots" path="${currentNode.path}/screenshots"/>
<jcr:node var="iconFolder" path="${currentNode.path}/icon" />

<c:forEach var="iconItem" items="${iconFolder.nodes}">
    <c:set var="icon" value="${iconItem}"/>
</c:forEach>

<c:set var="description" value="${currentNode.properties['description'].string}"/>
<c:url var="iconUrl" value="${url.currentModule}/img/icon.png"/>
<c:set var="FAQ" value="${currentNode.properties['FAQ'].string}"/>

<%@include file="../../commons/authorName.jspf"%>

<jcr:nodeProperty node="${currentNode}" name="j:tagList" var="assignedTags"/>
<c:set var="reviewedByJahia" value="${currentNode.properties['reviewedByJahia'].boolean}"/>
<c:set var="supportedByJahia" value="${currentNode.properties['supportedByJahia'].boolean}"/>
<c:set var="published" value="${currentNode.properties['published'].boolean}" />
<fmt:message var="labelEmpty" key="jnt_forgeEntry.label.empty"/>

<c:forEach items="${currentNode.properties['j:defaultCategory']}" var="cat" varStatus="vs">
    <c:set var="category" value="${cat}"/>
</c:forEach>
<c:url value='${url.base}${currentNode.path}' var="currentNodeUrl"/>
<c:set var="tags" value="${currentNode.properties['j:tagList']}"/>

<c:set var="moduleCategories" value="${renderContext.site.properties['rootCategory'].node}"/>

<template:addResources type="inlinejavascript">
    <script type="text/javascript">
        var tagClasses = ["label-info", "label-success", "label-warning", "label-danger"];
        var API_URL_START = "modules/api/jcr/v1";
        var context = "${url.context}";
        var currentLocale = "${currentResource.locale}";
        var nodeId = '${currentNode.identifier}';
        var editor = [];
        var categories = [];
        <c:if test="${! empty moduleCategories && jcr:hasChildrenOfType(moduleCategories, 'jnt:category')}">
        <c:forEach items="${jcr:getNodes(moduleCategories, 'jnt:category')}" var="moduleCategory">
        categories.push({value: '${moduleCategory.identifier}', text: '${moduleCategory.displayableName}'});
        </c:forEach>
        </c:if>

        /*Call publication action*/
        function publishModule(attribute){
            var btn = $('#publishModule-${id}');
            var data = {};
            data['publish'] = attribute;
            $.post('<c:url value='${url.base}${currentNode.path}.publishModule.do'/>', data, function(result) {
                var published = result['published'];
                if (result['published'] != null) {
                    //btn.toggleClass('btn-success btn-danger');
                    btn.attr("data-value", result['published']);
                    if (published){
                        //btn.text('<fmt:message key="jnt_forgeEntry.label.developer.unpublish"/>');
                        window.location.reload();
                    }
                    else{
                        // btn.text('<fmt:message key="jnt_forgeEntry.label.developer.publish"/>');
                        window.location.reload();
                    }
                }
            }, "json");
        }

        function deleteModule(){
            var btn = $(this);
            if (!btn.hasClass('disabled')) {
                $.post('<c:url value='${url.base}${currentNode.path}.deleteModule.do'/>', null, function(result) {
                    $('#deleteModuleModal-${id}').modal('hide');
                    window.location = '<c:url value='${url.base}${currentNode.resolveSite.path}/home.html'/>';
                }, "json");
            }
        }

        function addTag(){
            var term = $(".tagInput").val();
            var data = {"properties":{"j:tagList":{"multiValued":true,
                "value": [
                    <c:forEach var="currentTag" items="${tags}" varStatus="tagStatusIndex">
                    "${currentTag.string}",
                    </c:forEach>
                    term]}}};
            var myJSONText = JSON.stringify(data);

            jahiaAPIStandardCall(context, "live", currentLocale, "nodes", nodeId, "PUT", myJSONText, function(a,b){
            }, function(a,b){
            });
        }

        $(document).ready(function () {
            //Tag Management
            //Display tags with different colors
            $(".moduleTag").each(function(a,b){
                $(b).addClass(tagClasses[a%tagClasses.length]);
            });

            $('#editPictures, #editVideos').on('hidden.bs.modal', function () {
                window.location.reload();
            });

            //Make the tags Editable with a popover
            $('#tags-${id}').editable({
                inputclass: 'input-large',
                select2: {
                    tags: true,
                    tokenSeparators: [",", " "],
                    ajax: {
                        url: '<c:url value="${url.base}${currentNode.path}.customMatchingTags.do"/>',
                        dataType: 'json',
                        data: function(term, page) {
                            return {
                                q: term,
                                limit:10
                            };
                        },
                        results: function(data, page) {
                            return {
                                results: $.map( data.tags, function( item ) {
                                    return {
                                        id: item.name,
                                        text: item.name
                                    }
                                })
                            };
                        }
                    },

                    // Take default tags from the input value
                    initSelection: function (element, callback) {
                        var data = [];

                        function splitVal(string, separator) {
                            var val, i, l;
                            if (string === null || string.length < 1) return [];
                            val = string.split(separator);
                            for (i = 0, l = val.length; i < l; i = i + 1) val[i] = $.trim(val[i]);
                            return val;
                        }

                        $(splitVal(element.val(), ",")).each(function () {
                            data.push({
                                id: this,
                                text: this
                            });
                        });

                        callback(data);
                    },
                    formatSelection: function(item) {
                        return item.text;
                    },
                    formatResult: function(item) {
                        return item.text;
                    }
                },
                mode: 'popup',
                ajaxOptions: {
                    type: 'post',
                    dataType: 'json',
                    traditional:true
                },
                params: function(params) {
                    var data = {};
                    data['jcr:mixinTypes'] = 'jmix:tagged';
                    if(params.value.length > 0){
                        data['j:tagList'] = params.value;
                    }else {
                        data['j:tagList'] = "jcrClearAllValues";
                    }
                    data['jcrMethodToCall'] = 'put';
                    return data;
                },
                url: '${postURL}/',
                success: function(response, newValue) {
                    $('#moduleDeveloperPanel').triggerHandler('forgeModuleUpdated');
                },
                onblur:'ignore'
            });


            //Catgeory editable input
            $('#category-${id}').editable({
                source: categories,
                value: '${category.node.identifier}',
                <jsp:include page="../../commons/bootstrap-editable-options.jsp">
                <jsp:param name="postURL" value='${postURL}'/>
                </jsp:include>
            });

            <c:if test="${empty authorOrganisation}">
            $('#authorName-information-${id}').on('shown', function(e, editable) {
                $(this).next('.editable-container').find('.editable-input select option[value="organisation"]').attr("disabled","true");
            });
            </c:if>

            <c:if test="${empty authorFullName || authorFullName eq authorUsername}">
            $('#authorName-information-${id}').on('shown', function(e, editable) {
                $(this).next('.editable-container').find('.editable-input select option[value="fullName"]').attr("disabled","true");
            });
            </c:if>

            $('#authorName-information-${id}').editable({
                source: [{value:'username', text:'${authorUsername}'},
                    {value:'fullName', text:'${not empty authorFullName &&  authorFullName ne authorUsername ? authorFullName : labelEmptyFullName}'},
                    {value:'organisation', text: '${not empty authorOrganisation ? authorOrganisation : labelEmptyOrganisation}'}],
                value: '${authorNameDisplayedAs}',
                <jsp:include page="../../commons/bootstrap-editable-options.jsp">
                <jsp:param name="postURL" value="${postURL}"/>
                <jsp:param name="customSuccess" value="document.location = '${currentNode.url}';"/>
                </jsp:include>
            });

            //Video Remove Function
            <c:if test="${hasVideoNode}">
            $('#remove-video-${id}').click(function() {
                $.post('<c:url value="${url.base}${videoNode.path}"/>',{jcrMethodToCall: 'delete'}, function() {
                }, "json");
            });
            </c:if>


            //Initializing ck editors
            $('.ckarea').each(function(index,object){
                var textarea = $(object);
                CKEDITOR.replace(textarea.attr('id'));
            });

            $('#moduleForgeAdminPanel').find('.forgeAdminBtn').click(function() {

                var btn = $(this);
                var dataName = btn.attr('data-name');
                var dataValue = !(btn.attr('data-value') === 'true');
                var data = {};

                data[dataName] = dataValue;
                data['jcrMethodToCall'] = 'put';
                $.post('<c:url value='${url.base}${currentNode.path}'/>', data, function(result) {
                    btn.toggleClass('btn-success btn-danger');
                    btn.attr('data-value', result[dataName]);
                },"json")

            });

            // INPUTS
            // Input label

            $('input, textarea').blur(function() {
                var $this = $(this);
                if ($this.val())
                    $this.addClass('used');
                else
                    $this.removeClass('used');
            });

        });
    </script>
</template:addResources>
<div id="content" class="container detail">
    <div class="col-md-12">
        <div class="media">
            <div class="media-left">
                <c:if test="${isDeveloper && not viewAsUser}">
                <a data-toggle="tooltip" data-placement="left" title="<fmt:message key="jnt_forgeEntry.label.UpdateIcon"/>" href="#" onclick="document.getElementById('icon_input_${currentNode.identifier}').click();">
                </c:if>
                    <img class="moduleIcon" src="${not empty icon.url ? icon.url : iconUrl}" style="margin-top: 10px;"
                     alt="<fmt:message key="jnt_forgeEntry.label.moduleIcon"><fmt:param value="${title}"/></fmt:message>"/>
                <c:if test="${isDeveloper && not viewAsUser}">
                </a>
                </c:if>
                <c:if test="${isDeveloper && not viewAsUser}">
                    <div>
                        <c:url value='${url.base}${renderContext.mainResource.node.path}.updateModuleIcon.do' var="iconPostURL"/>
                        <c:url value='${url.currentModule}/img/loading.gif' var="loadingURL"/>
                        <form class="icon_upload" id="icon_upload_${currentNode.identifier}"
                              action="${iconPostURL}" method="POST" enctype="multipart/form-data">
                            <div id="icon_upload-${currentNode.identifier}" class="btn btn-block">
                                <input type="file" class="hide" id="icon_input_${currentNode.identifier}" name="file" onchange="submitIcon('${loadingURL}','${iconPostURL}','${currentNode.identifier}')"/>
                                <input  type="hidden" name="redirectURL" value="${renderContext.mainResource.node.path}"/>
                                <input type="hidden" name="jcrNodeType" value="jnt:file"/>
                            </div>
                        </form>
                    </div>
                </c:if>
            </div>
            <div class="media-body heading">
                <h3 class="media-heading">${title}</h3>
                <c:choose>
                    <c:when test="${not empty moduleMap.latestVersion}">
                        <jcr:nodeProperty node="${moduleMap.latestVersion}" name="versionNumber" var="versionNumber"/>
                        <a class="pull-right btn btn-success dwl" href="<c:url value="${moduleMap.latestVersion.properties.url.string}"/>"
                           <c:if test="${not isDeveloper}">onclick="countDownload('<c:url value="${url.base}${currentNode.path}"/>')"</c:if>>
                            <i class="fa fa-download"></i>
                            <fmt:message key="jnt_forgeEntry.label.simpleDownload"/>
                        </a>
                    </c:when>

                    <c:otherwise>
                        <a class="pull-right btn btn-success dwl disabled" href="<c:url value="${moduleMap.latestVersion.properties.url.string}"/>"
                           <c:if test="${not isDeveloper}">onclick="countDownload('<c:url value="${url.base}${currentNode.path}"/>')"</c:if>>
                            <i class="fa fa-download"></i>
                            <fmt:message key="jnt_forgeEntry.label.simpleDownload"/>
                        </a>
                    </c:otherwise>
                </c:choose>
                <c:forEach items="${assignedTags}" var="tag" varStatus="status">
                    <span class="label moduleTag">${fn:escapeXml(tag.string)}</span>
                </c:forEach>
                <div class="author">
                        <c:if test="${isDeveloper && not viewAsUser}">
                            <a data-original-title="<fmt:message key="jnt_forgeEntry.label.askAuthorNameDisplayedAs"/>" data-placement="right" data-name="authorNameDisplayedAs" data-pk="1" data-type="select"
                               id="authorName-information-${id}" href="#" class="editable editable-click">
                        </c:if>
                        ${authorName}
                        <c:if test="${isDeveloper && not viewAsUser}">
                            </a>
                        </c:if>
                </div>
                <div class="rating">
                    <c:forEach var="i" begin="${worstRating}" end="${bestRating}">
                        <c:choose>
                            <c:when test="${entireRating ge i}">
                                &#9733;
                            </c:when>
                            <c:otherwise>
                                &#9734;
                            </c:otherwise>
                        </c:choose>
                    </c:forEach>
                    <div class="developperEmail">
                        <c:choose>
                            <c:when test="${isDeveloper && not viewAsUser}">
                                <c:choose>
                                    <c:when test="${authorIsOrganisation}">
                                        <a id="authorEmail-${id}" class="pull-right btn btn-small btn-primary"
                                           data-type="text" data-name="authorEmail" href="#"><fmt:message key="jnt_forgeEntry.label.editAuthorEmail"/></a>
                                    </c:when>
                                    <c:otherwise>
                                        <a id="authorEmail-${id}" class="pull-right btn btn-small btn-primary" href="#">${not empty userEmail ? userEmail.string : labelEmpty}</a>
                                    </c:otherwise>
                                </c:choose>
                            </c:when>
                            <c:otherwise>
                                <c:if test="${not empty authorEmail}">
                                </c:if>
                                <c:choose>
                                    <c:when test="${authorIsOrganisation && not empty authorEmail}">
                                        <a class="pull-right btn btn-small btn-primary" href="mailto:${authorEmail}?Subject=${fn:replace(title, " ","%20")}%20-%20Version:%20${versionNumber.string}"><fmt:message key="jnt_forgeEntry.label.authorEmail"/></a>
                                    </c:when>
                                    <c:when test="${not authorIsOrganisation && not empty userEmail}">
                                        <a class="pull-right btn btn-small btn-primary" href="mailto:${userEmail.string}?Subject=${fn:replace(title, " ","%20")}%20-%20Version:%20${versionNumber.string}"><fmt:message key="jnt_forgeEntry.label.authorEmail"/></a>
                                    </c:when>
                                </c:choose>
                            </c:otherwise>
                        </c:choose>
                    </div>
                </div>
                <div class="labelisation">
                    <c:if test="${currentNode.properties['reviewedByJahia'].boolean}">
                <span class="label label-success">
                    <i class="glyphicon glyphicon-ok icon-white"></i>
                    <fmt:message key="jnt_forgeEntry.label.admin.reviewedByJahia"/>
                </span>&nbsp;
                    </c:if>
                    <c:if test="${currentNode.properties['supportedByJahia'].boolean}">
                <span class="label label-warning">
                    <i class="glyphicon glyphicon-wrench icon-white"></i>
                    <fmt:message key="jnt_forgeEntry.label.admin.supportedByJahia"/>
                </span>
                    </c:if>
                </div>
            </div>
            <div class="ck_editable" id="descriptionDiv">
                <h4><fmt:message key="jnt_forgeEntry.label.moduleDescription"/></h4>
                <div class="original_text" <c:if test="${isDeveloper && not viewAsUser}">onclick="switchDiv('descriptionDiv')"</c:if>>
                    <p id="description" class="textarea">${description}</p>
                </div>
                <c:if test="${isDeveloper && not viewAsUser}">
                    <div class="editable_text hide">
                        <textarea class="ckarea" name="description" id="description_editor" rows="10" cols="80">
                            <c:out value="${description}"/>
                        </textarea>
                        <button class="btn btn-primary" type="button" onclick="submitText('description', 'descriptionDiv', 'original_text', true)"><fmt:message key="save"/></button>
                        <button class="btn btn-default" type="button" onclick="switchDiv('descriptionDiv')"><fmt:message key="cancel"/></button>
                    </div>
                </c:if>
            </div>
            <div class="carousel">
                <!--<img src="http://placehold.it/1110x620?text=Slider+goes+here">-->
                <template:module node="${screenshots}" view="v2">
                    <template:param name="id" value="${currentNode.identifier}"/>
                </template:module>
            </div>

            <c:if test="${isForgeAdmin or isDeveloper && not viewAsUser}">
                <div id="editPictures" class="modal fade" role="dialog" tabindex="-1" data-focus-on="input:first">
                    <div class="modal-dialog editPicturesDialog">
                        <div class="modal-content">
                            <div class="modal-body" id="editPicture">
                                <template:include view="screenshotsv2"/><br/>
                            </div>
                        </div>
                    </div>
                </div>
                <div id="editVideos" class="modal fade" role="dialog">
                    <div class="modal-dialog editVideoDialog">
                        <div class="modal-content">
                            <div class="modal-body" id="editVideo">
                                <template:include view="videov2"/><br/>
                            </div>
                        </div>
                    </div>
                </div>
            </c:if>
            <c:if test="${hasVideoNode}">
                <div id="forgeModuleVideoWrapper-${id}" class="forgeModuleVideo">
                    <template:module path="${videoNode.path}" view="forge"/>
                </div>
            </c:if>
            <div class="media-body content">
                <c:if test="${isForgeAdmin or isDeveloper}">
                    <div id="moduleForgeAdminPanel">
                    <h4><fmt:message key="jnt_forgeEntry.label.admin.title"/></h4>
                    <c:if test="${isForgeAdmin}">
                        <div class="btn-group">
                            <button class="forgeAdminBtn btn btn-small ${reviewedByJahia ? 'btn-success' : 'btn-danger'}"
                                    data-value="${reviewedByJahia}" data-name="reviewedByJahia">
                                <fmt:message key="jnt_forgeEntry.label.admin.reviewedByJahia"/>
                            </button>
                            <button class="forgeAdminBtn btn btn-small ${supportedByJahia ? 'btn-success' : 'btn-danger'}"
                                    data-value="${supportedByJahia}" data-name="supportedByJahia">
                                <fmt:message key="jnt_forgeEntry.label.admin.supportedByJahia"/>
                            </button>
                        </div>
                    </c:if>
                    <c:if test="${isDeveloper}">
                        <div class="btn-group">
                            <button id="publishModule-${id}" class="btn btn-small ${published ? 'btn-success': 'btn-danger'}" data-value="${!published}" onclick="publishModule(${!published})">
                                <c:choose>
                                    <c:when test="${published}"><fmt:message key="jnt_forgeEntry.label.developer.unpublish"/></c:when>
                                    <c:otherwise><fmt:message key="jnt_forgeEntry.label.developer.publish"/></c:otherwise>
                                </c:choose>
                            </button>
                            <button id="deleteModule-${id}" class="btn btn-small" data-toggle="modal" data-target="#deleteModuleModal-${id}">
                                <fmt:message key="jnt_forgeEntry.label.developer.delete"/>
                            </button>
                        </div>
                        <div id="deleteModuleModal-${id}" class="modal fade" role="dialog" aria-labelledby="deleteModuleModal-${id}" aria-hidden="true">
                            <div class="modal-dialog deleteDialog">
                                <div class="modal-header">
                                    <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
                                    <h3 id="deleteModuleModal-${id}"><fmt:message key="jnt_forgeModule.label.developer.modal.delete.header"/></h3>
                                </div>
                                <div class="modal-body">
                                    <p>
                                        <fmt:message key="jnt_forgeModule.label.developer.modal.delete.body">
                                            <fmt:param value="${currentNode.displayableName}"/>
                                        </fmt:message>
                                    </p>
                                </div>
                                <div class="modal-footer">
                                    <button class="btn" data-dismiss="modal" aria-hidden="true"><fmt:message key="jnt_review.label.admin.modal.delete.cancel"/></button>
                                    <button class="btn btn-primary" id="confirmDeleteModule-${id}" onclick="deleteModule()"><fmt:message key="jnt_review.label.admin.modal.delete.confirm"/></button>
                                </div>
                            </div>
                        </div>

                            <button id="editPicturesButton" type="button" class="btn btn-default detailButton pull-right" data-toggle="modal" data-target="#editPictures"><fmt:message key="jnt_forgeEntry.label.editPictures"/></button>
                            <button type="button" class="btn btn-default detailButton pull-right" data-toggle="modal" data-target="#editVideos"><fmt:message key="jnt_forgeEntry.label.editVideo"/></button>
                        </div>
                    </c:if>

                </c:if>

                <h4><fmt:message key="forge.module.label.additionalInformation"/></h4>

                <div class="more-info-container">

                    <div class="meta-info">
                        <div class="title"><fmt:message key="jnt_forgeEntry.label.moduleId"/></div>
                        <div class="content">${currentNode.name}</div>
                    </div>

                    <div class="meta-info">
                        <div class="title"><fmt:message key="jnt_forgeEntry.label.groupId"/></div>
                        <div class="content">${currentNode.properties['groupId'].string}</div>
                    </div>

                    <div class="meta-info">
                        <div class="title">
                            <fmt:message key="jnt_forgeEntry.label.updated" var="updatedLabel"/>
                            ${fn:replace(updatedLabel,':','')}
                        </div>
                        <div class="content"><time itemprop="datePublished">
                            <fmt:formatDate value="${latestVersion.properties['jcr:lastModified'].date.time}" pattern="yyyy-MM-dd" />
                        </time></div>
                    </div>

                    <div class="meta-info">
                        <div class="title">
                            <fmt:message key="jnt_forgeEntry.label.version" var="versionLabel"/>
                            ${fn:replace(versionLabel,':','')}
                        </div>

                        <div class="content">
                            <button type="button" class="btn btn-default detailButton" data-toggle="modal" data-target="#changeLogModal">
                                <c:choose>
                                    <c:when test="${not empty versionNumber.string}">
                                        ${versionNumber.string}
                                    </c:when>
                                    <c:otherwise>
                                        <fmt:message key="jnt_forgemodule.clickForUpload"/>
                                    </c:otherwise>
                                </c:choose>

                            </button>

                            <div id="changeLogModal" class="modal fade" role="dialog">
                                <div class="modal-dialog changeLogDialog">
                                    <div class="modal-content">
                                        <iframe src="${fn:replace(currentNode.url,".html",".changelog2.html")}"></iframe>
                                        <%--<template:include view="changeLogv2"/>--%>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="meta-info">
                        <div class="title">
                            <fmt:message key="jnt_forgeEntry.label.relatedJahiaVersion" var="JahiaVersionLabel"/>
                            ${fn:replace(JahiaVersionLabel,':','')}
                        </div>
                        <div class="content">
                            ${fn:replace(latestVersion.properties['requiredVersion'].node.displayableName,'version-','')}<br/>
                        </div>
                    </div>

                    <div class="meta-info">
                        <div class="title">
                            <fmt:message key="jnt_forgeEntry.label.authorName" var="authorLabel"/>
                            ${fn:replace(authorLabel,':','')}
                        </div>
                        <div class="content">${authorName}</div>
                    </div>
                    <c:if test="${(isDeveloper && not viewAsUser) or not empty category}">
                        <div class="meta-info">
                            <div class="title"><fmt:message key="jnt_forgeEntry.label.category"/></div>
                            <div class="content">
                                <c:if test="${isDeveloper && not viewAsUser}">
                                <a data-original-title="<fmt:message key="jnt_forgeEntry.label.askCategory"/>" data-name="j:defaultCategory" data-pk="1" data-type="select"
                                   id="category-${id}" href="#" class="editable editable-click">
                                    </c:if>
                                    ${not empty category ? category.node.displayableName : labelNotSelected}
                                    <c:if test="${isDeveloper && not viewAsUser}">
                                </a>
                                </c:if>
                                ${categoryNode.displayableName}

                            </div>
                        </div>
                    </c:if>
                    <c:if test="${isDeveloper && not viewAsUser}">
                        <div class="meta-info ui-widget">
                            <div class="title">Add Tags</div>
                            <a href="#" id="tags-${id}" class="editable editable-click" data-type="select2" data-pk="1" data-original-title="<fmt:message key="jnt_forgeEntry.label.developer.addTag"/>">
                                <c:forEach items="${assignedTags}" var="tag" varStatus="status">${fn:escapeXml(tag.string)}${not status.last ? ', ' : ''}</c:forEach>
                            </a>
                        </div>
                    </c:if>

                    <div class="meta-info large">
                        <c:choose>
                            <c:when test="${isDeveloper && not viewAsUser}">
                                <div class="ck_editable" id="authorURLDiv">
                                    <div class="original_text" <c:if test="${isDeveloper && not viewAsUser}">onclick="switchDiv('authorURLDiv')"</c:if>>
                                        <span id="authorURL-${id}" class="btn btn-default detailButton"
                                           data-original-title="<fmt:message key="jnt_forgeEntry.label.editAuthorURL"/>" data-pk="1"
                                           data-type="text" data-name="authorURL" ><fmt:message key="jnt_forgeEntry.label.editAuthorURL"/></span>
                                    </div>
                                    <div class="editable_text hide">
                                        <input class="form-control" name="authorURL" id="authorURL" value="<c:out value="${authorURL}"/>"/>
                                        <div id="authorURLSubmit" class="submit-buttons">
                                            <button class="btn btn-primary" type="button" onclick="submitText('authorURL', 'authorURLDiv', 'original_text', false)"><fmt:message key="save"/></button>
                                            <button class="btn btn-default pull-right" type="button" onclick="switchDiv('authorURLDiv')"><fmt:message key="cancel"/></button>
                                        </div>
                                    </div>
                                </div>
                            </c:when>
                            <c:otherwise>
                                <c:if test="${not empty authorURL}">
                                    <a class="btn btn-default detailButton" target="_blank" href="${authorURL}"><fmt:message key="jnt_forgeEntry.label.authorURL"/></a>
                                </c:if>
                            </c:otherwise>
                        </c:choose>

                    </div>
                </div>
                <c:if test="${(isDeveloper && not viewAsUser) or not empty FAQ}">
                    <button type="button" class="btn btn-default pull-right detailButton" data-toggle="modal" data-target="#faqModal" <c:if test="${empty FAQ}">onclick="switchDiv('faqDiv')"</c:if>><fmt:message key="jnt_forgeModule.FAQ"/></button>
                    <div id="faqModal" class="modal fade" role="dialog">
                        <div class="modal-dialog faqDialog">
                            <div class="modal-content">
                                <div class="ck_editable" id="faqDiv">
                                    <h2 class="modal-title"><fmt:message key="jnt_forgeEntry.label.FAQ"/></h2>
                                    <div class="original_text" <c:if test="${isDeveloper && not viewAsUser}">onclick="switchDiv('faqDiv')"</c:if>>
                                        <p id="FAQ" class="textarea">
                                            ${FAQ}
                                        </p>
                                    </div>
                                    <c:if test="${isDeveloper && not viewAsUser}">
                                        <div class="editable_text hide">
                                        <textarea class="ckarea" name="FAQ" id="FAQ_editor" rows="10" cols="80">
                                             <c:out value="${FAQ}"/>
                                        </textarea>
                                        <div class="ckButtonsDiv pull-center">
                                            <button class="btn btn-primary" type="button" onclick="submitText('FAQ', 'faqDiv', 'original_text', true)"><fmt:message key="save"/></button>
                                            <button class="btn btn-default" type="button" onclick="switchDiv('faqDiv')"><fmt:message key="cancel"/></button>
                                        </div>
                                        </div>
                                    </c:if>
                                </div>
                            </div>
                        </div>
                    </div>
                </c:if>
                <c:if test="${fn:length( fn:trim( functions:removeHtmlTags( fn:replace(howToInstall, '&nbsp;', ' ') ))) eq 0
                && (not isDeveloper || viewAsUser)}">
                    <c:set var="emptyHowToInstall" value="true"/>
                </c:if>
                <c:if test="${(isDeveloper && not viewAsUser) or not emptyHowToInstall}">
                    <button id="howToInstallButton" type="button" class="btn btn-default pull-right detailButton" data-toggle="modal" data-target="#howToInstallModal" <c:if test="${emptyHowToInstall}">onclick="switchDiv('howToInstallDiv')"</c:if>><fmt:message key="jnt_forgeEntry.installation"/></button>
                    <div id="howToInstallModal" class="modal fade" role="dialog">
                        <div class="modal-dialog howToInstallDialog">
                            <div class="modal-content">
                                <div class="ck_editable" id="howToInstallDiv">
                                    <div class="original_text" <c:if test="${isDeveloper && not viewAsUser}">onclick="switchDiv('howToInstallDiv')"</c:if>>
                                        <h2><fmt:message key="jnt_forgeModule.howToInstall"/></h2>
                                        <p id="howToInstall" class="textarea">
                                                ${howToInstall}
                                        </p>
                                    </div>
                                    <c:if test="${isDeveloper && not viewAsUser}">
                                        <div class="editable_text hide">
                                        <textarea class="ckarea" name="howToInstall" id="howToInstall_editor" rows="10" cols="80">
                                             <c:out value="${howToInstall}"/>
                                        </textarea>
                                            <div class="ckButtonsDiv pull-center">
                                                <button class="btn btn-primary" type="button" onclick="submitText('howToInstall', 'howToInstallDiv', 'original_text', true)"><fmt:message key="save"/></button>
                                                <button class="btn btn-default" type="button" onclick="switchDiv('howToInstallDiv')"><fmt:message key="cancel"/></button>
                                            </div>
                                        </div>
                                    </c:if>
                                </div>
                            </div>
                        </div>
                    </div>
                </c:if>
                <c:if test="${(isDeveloper && not viewAsUser)}">
                    <button id="permissionsButton" type="button" class="btn btn-default pull-right detailButton" data-toggle="modal" data-target="#permissionsModal"><fmt:message key="jnt_forgeEntry.modulePermissions"/></button>
                    <div id="permissionsModal" class="modal fade" role="dialog">
                        <div class="modal-dialog permissionsDialog">
                            <div class="modal-content">
                                <div class="container">
                                    <iframe src="${fn:replace(currentNode.url,".html",".permissions.html")}"></iframe>
                                </div>
                            </div>
                        </div>
                    </div>
                </c:if>
                <h4>User Reviews</h4>
                <%@ include file="reviews.jspf"%>
            </div>
        </div>
    </div>
</div>