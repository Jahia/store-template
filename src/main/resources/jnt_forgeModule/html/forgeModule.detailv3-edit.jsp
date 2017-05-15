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
<template:addResources type="javascript" resources="libraries/zoom/zoom.js"/>
<template:addResources type="javascript" resources="libraries/fileinput/fileinput.js"/>
<template:addResources type="css" resources="libraries/fileinput.css"/>
<template:addResources type="javascript" resources="ckeditor.js"/>
<template:addCacheDependency node="${moduleMap.latestVersion}"/>
<template:addCacheDependency path="${currentNode.path}/screenshots"/>
<c:set var="hasRepositoryAccess" value="${jcr:hasPermission(currentNode, 'repositoryExplorer')}"/>
<%@include file="../../commons/authorName.jspf" %>
<jsp:useBean id="uniqueDependants" class="java.util.LinkedHashMap"/>
<jcr:sql
        var="query"
        sql="SELECT * FROM [jnt:forgeModuleVersion] AS moduleVersion
            WHERE isdescendantnode(moduleVersion,['${currentNode.path}'])"
/>
<c:set var="sortedModules" value="${forge:sortByVersion(query.nodes)}"/>
<c:set target="${moduleMap}" property="latestVersion" value="${forge:latestVersion(sortedModules)}"/>
<c:set var="title" value="${currentNode.properties['jcr:title'].string}"/>
<c:set var="description" value="${currentNode.properties['description'].string}"/>
<c:set var="howToInstall" value="${currentNode.properties['howToInstall'].string}"/>
<c:set var="authorURL" value="${currentNode.properties['authorURL'].string}"/>
<c:set var="authorEmail" value="${currentNode.properties['authorEmail'].string}"/>

<c:set var="hasVideoNode" value="${jcr:hasChildrenOfType(currentNode, 'jnt:videostreaming')}"/>
<c:if test="${hasVideoNode}">
    <jcr:node var="videoNode" path="${currentNode.path}/video"/>
    <c:set var="videoProvider" value="${videoNode.properties['provider'].string}"/>
    <c:set var="videoIdentifier" value="${videoNode.properties['identifier'].string}"/>
    <c:set var="videoHeight" value="${videoNode.properties['height'].string}"/>
    <c:set var="videoWidth" value="${videoNode.properties['width'].string}"/>
    <c:set var="videoAllowfullscreen" value="${videoNode.properties['allowfullscreen'].string}"/>
</c:if>

<c:set var="FAQ" value="${currentNode.properties['FAQ'].string}"/>
<c:if test="${fn:length( fn:trim( functions:removeHtmlTags( fn:replace(FAQ, '&nbsp;', ' ') ))) eq 0
                        && (not isDeveloper || viewAsUser)}">
    <c:set var="emptyFAQ" value="true"/>
</c:if>

<jcr:nodeProperty node="${moduleMap.latestVersion}" name="versionNumber" var="versionNumber"/>
<jcr:nodeProperty node="${currentNode}" name="j:tagList" var="assignedTags"/>
<jcr:node var="screenshots" path="${currentNode.path}/screenshots"/>

<c:forEach items="${currentNode.properties['j:defaultCategory']}" var="cat" varStatus="vs">
    <c:set var="category" value="${cat}"/>
</c:forEach>

<%--Icon url--%>
<c:url var="iconUrl" value="${url.currentModule}/img/icon.png"/>
<jcr:node var="iconFolder" path="${currentNode.path}/icon"/>
<c:forEach var="iconItem" items="${iconFolder.nodes}">
    <c:set var="icon" value="${iconItem}"/>
</c:forEach>

<c:set var="moduleStatus"
       value="${not empty currentNode.properties['status'].string?currentNode.properties['status'].string:'community'}"/>
<c:if test="${moduleStatus eq 'supported' or currentNode.properties['supportedByJahia'].boolean}">
    <c:set var="moduleStatus" value="supported"/>
</c:if>
<c:forEach items="${jcr:getChildrenOfType(screenshots,'jmix:image')}" var="screenshot" varStatus="stat">
    <c:set var="preload">${preload}'<img src="${screenshot.thumbnailUrls['thumbnail']}" class="file-preview-image">'<c:if
            test="${not stat.last}">,</c:if></c:set>
</c:forEach>
<script>
    $(document).ready(function () {
        $("#file").fileinput({
            uploadUrl       : "<c:url value='${url.base}${currentNode.path}.updateModuleIcon.do'/>", // server upload action
            uploadAsync     : true,
            maxFileCount    : 1,
            allowedFileTypes: ['image'],
            initialPreview  : [
                '<img  src="${not empty icon.url ? icon.url : iconUrl}" class="file-preview-image">'
            ]
        });

        $("#screenshots").fileinput({
            uploadUrl           : "<c:url value='${url.base}${currentNode.path}/screenshots/*'/>", // server upload action
            uploadAsync         : true,
            maxFileCount        : 10,
            allowedFileTypes    : ['image'],
            initialPreview      : [${preload}],
            initialPreviewConfig: [
                    <c:forEach items="${jcr:getChildrenOfType(screenshots,'jmix:image')}" var="screenshot" varStatus="stat">{
                    url: '<c:url value="${url.base}${screenshot.path}.deleteScreenshot.do"/>'}<c:if test="${not stat.last}">, </c:if>
                </c:forEach>
            ]

        });
        //Initializing ck editors
        $('.ckarea').each(function (index, object) {
            var textarea = $(object);
            CKEDITOR.replace(textarea.attr('id'));
        });
    });
</script>

<div class="container" style="margin-top: 50px;">
    <div class="row">
        <div class="col-md-3">
            <template:tokenizedForm allowsMultipleSubmits="true">
                <form action="<c:url value='${url.base}${currentNode.path}.updateModuleIcon.do'/>"
                      method="POST" enctype="multipart/form-data">
                    <label for="file" class="control-label"><fmt:message
                            key="forge.editModule.uploadIcon.label"/></label>
                    <input type="file" name="file" id="file" class="file-loading">

                </form>
            </template:tokenizedForm>
        </div>
        <div class="col-md-9">
            <div class="row">
                <div class="col-md-10">
                    <h2>${title}
                        <c:choose>
                            <c:when test="${moduleStatus eq 'supported'}">
                            <span class="module-supported">
                                <i class="material-icons noselect" title="${moduleStatus}">check_circle</i>
                            </span>
                            </c:when>
                        </c:choose></h2>
                    <button type="button" class="btn btn-primary btn-xs" data-toggle="modal" data-target="#myModal">
                        Preview
                    </button>
                    <div class="modal fade" id="myModal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
                        <div class="modal-dialog modal-lg" role="document">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span
                                            aria-hidden="true">&times;</span></button>
                                    <h4 class="modal-title" id="myModalLabel">Modal title</h4>
                                </div>
                                <div class="modal-body">
                                    <iframe src="<c:url value="${url.base}${currentNode.path}.html"/>" width="800px"
                                            height="900px"></iframe>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-12">
                    <!-- Nav tabs -->
                    <ul class="nav nav-tabs" role="tablist">
                        <li role="presentation" class="active"><a href="#home" aria-controls="home" role="tab"
                                                                  data-toggle="tab">Informations</a></li>
                        <li role="presentation"><a href="#profile" aria-controls="profile" role="tab"
                                                   data-toggle="tab">Install</a></li>
                        <li role="presentation"><a href="#messages" aria-controls="messages" role="tab"
                                                   data-toggle="tab">Medias</a></li>
                        <li role="presentation"><a href="#settings" aria-controls="settings" role="tab"
                                                   data-toggle="tab">Metadata</a>
                        </li>
                    </ul>

                    <!-- Tab panes -->
                    <div class="tab-content">
                        <div role="tabpanel" class="tab-pane active" id="home">
                            <div class="row">
                                <div class="col-md-12" style="margin-top: 15px">
                                    <template:tokenizedForm allowsMultipleSubmits="true">
                                        <form class="form-horizontal"
                                              action="<c:url value='${url.base}${currentNode.path}'/>"
                                              method="post">
                                            <input type="hidden" name="jcrMethodToCall" value="PUT"/>
                                            <input type="hidden" name="jcrRedirectTo"
                                                   value="<c:url value='${url.base}${currentNode.path}.store-module-v2-edit'/>"/>
                                            <div class="form-group">
                                                <label for="title"
                                                       class="control-label col-sm-2">Name</label>
                                                <div class="col-sm-10">
                                                    <input type="text" class="form-control" name="jcr:title" id="title"
                                                           value="${title}"/>
                                                </div>
                                            </div>
                                            <div class="form-group">
                                                <label for="description_editor"
                                                       class="control-label col-sm-2">Description</label>
                                                <div class="col-sm-10">
                                            <textarea class="ckarea form-control" name="description"
                                                      id="description_editor" rows="5" cols="60">
                                                <c:out value="${description}"/>
                                            </textarea>
                                                </div>
                                            </div>
                                            <div class="form-group">
                                                <label for="authorURL"
                                                       class="control-label col-sm-2">Author URL</label>
                                                <div class="col-sm-10">
                                                    <input type="text" class="form-control" name="authorURL"
                                                           id="authorURL"
                                                           value="${authorURL}"/>
                                                </div>
                                            </div>
                                            <div class="form-group">
                                                <label for="authorEmail"
                                                       class="control-label col-sm-2">Author Email</label>
                                                <div class="col-sm-10">
                                                    <input type="text" class="form-control" name="authorEmail"
                                                           id="authorEmail"
                                                           value="${authorEmail}"/>
                                                </div>
                                            </div>
                                            <div class="form-group">
                                                <label for="authorNameDisplayedAs"
                                                       class="control-label col-sm-2">Author Email</label>
                                                <div class="col-sm-10">
                                                    <select type="text" class="form-control"
                                                            name="authorNameDisplayedAs" id="authorNameDisplayedAs">
                                                        <option value="username"
                                                                <c:if test="${authorNameDisplayedAs eq 'username'}">selected</c:if>>
                                                            Username
                                                        </option>
                                                        <option value="fullName"
                                                                <c:if test="${authorNameDisplayedAs eq 'fullName'}">selected</c:if>>
                                                            Fullname
                                                        </option>
                                                        <option value="organisation"
                                                                <c:if test="${authorNameDisplayedAs eq 'organisation'}">selected</c:if>>
                                                            Organisation
                                                        </option>
                                                    </select>
                                                </div>
                                            </div>

                                            <button type="submit" class="btn btn-warning">Submit</button>
                                        </form>
                                    </template:tokenizedForm>
                                </div>
                            </div>
                        </div>
                        <div role="tabpanel" class="tab-pane" id="profile"><template:tokenizedForm
                                allowsMultipleSubmits="true">
                            <form class="form-horizontal"
                                  action="<c:url value='${url.base}${currentNode.path}'/>"
                                  method="post">
                                <input type="hidden" name="jcrMethodToCall" value="PUT"/>
                                <input type="hidden" name="jcrRedirectTo"
                                       value="<c:url value='${url.base}${currentNode.path}.store-module-v2-edit'/>"/>
                                <div class="form-group">
                                    <label for="install"
                                           class="control-label col-sm-2">How To Install</label>
                                    <div class="col-sm-10">
                                            <textarea class="ckarea form-control" name="howToInstall"
                                                      id="install" rows="5" cols="60">
                                                <c:out value="${howToInstall}"/>
                                            </textarea>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="faq"
                                           class="control-label col-sm-2">FAQ</label>
                                    <div class="col-sm-10">
                                            <textarea class="ckarea form-control" name="FAQ"
                                                      id="faq" rows="5" cols="60">
                                                <c:out value="${FAQ}"/>
                                            </textarea>
                                    </div>
                                </div>
                                <button type="submit" class="btn btn-warning">Submit</button>
                            </form>
                        </template:tokenizedForm></div>
                        <div role="tabpanel" class="tab-pane" id="messages">
                            <div class="row">
                                <div class="col-md-12">
                                    <template:tokenizedForm allowsMultipleSubmits="true">
                                        <form action="<c:url value='${url.base}${currentNode.path}/screenshots/*'/>"
                                              method="POST" enctype="multipart/form-data">
                                            <label for="screenshots" class="control-label">Screenshots</label>
                                            <input type="file" name="screenshots" id="screenshots" multiple
                                                   class="file-loading">
                                        </form>
                                    </template:tokenizedForm>
                                </div>
                            </div>
                        </div>
                        <div role="tabpanel" class="tab-pane" id="settings">Metadata</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

</div>