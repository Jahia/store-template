<%@ taglib prefix="jcr" uri="http://www.jahia.org/tags/jcr" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="utility" uri="http://www.jahia.org/tags/utilityLib" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="query" uri="http://www.jahia.org/tags/queryLib" %>
<%@ taglib prefix="functions" uri="http://www.jahia.org/tags/functions" %>
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

<template:addResources type="css" resources="libraries/bootstrap3-wysihtml5.min.css,
                                             libraries/bootstrap-editable.css,
                                             libraries/jqtree.css"/>
<template:addResources type="javascript" resources="libraries/bootstrap-editable.min.js"/>

<template:addResources type="css" resources="libraries/fileinput.min.css"/>
<template:addResources type="css" resources="appStore.css"/>
<template:addResources type="javascript" resources="libraries/fileinput/plugins/canvas-to-blob.min.js,
                                                    libraries/fileinput/plugins/sortable.min.js,
                                                    libraries/fileinput/plugins/purify.min.js,
                                                    libraries/fileinput/fileinput.js,
                                                    libraries/fileinput/themes/fa/theme.js,
                                                    libraries/fileinput/locales/${renderContext.mainResourceLocale}.js
                                                    "/>

<c:set var="id" value="${currentNode.identifier}"/>
<c:set var="isDeveloper" value="${jcr:hasPermission(currentNode, 'jcr:write')}"/>
<c:if test="${isDeveloper}">
    <c:set var="viewAsUser" value="${not empty param['viewAs'] && param['viewAs'] eq 'user'}"/>
</c:if>

<jcr:sql
        var="query"
        sql="SELECT * FROM [jnt:forgeModuleVersion] AS moduleVersion
            WHERE isdescendantnode(moduleVersion,['${currentNode.path}'])"
/>
<c:set var="sortedModules" value="${forge:sortByVersion(query.nodes)}"/>
<c:set target="${moduleMap}" property="latestVersion" value="${forge:latestVersion(sortedModules)}" />
<c:set target="${moduleMap}" property="previousVersions" value="${forge:previousVersions(sortedModules)}" />
<c:set target="${moduleMap}" property="nextVersions" value="${forge:nextVersions(sortedModules)}" />
<c:url value='${url.base}${renderContext.site.path}/contents/modules-repository.createEntryFromJar.do' var="updateModule"/>
<template:include view="hidden.sql">
    <template:param name="getLatestVersion" value="true"/>
    <template:param name="getPreviousVersions" value="true"/>
</template:include>
<c:set value="${moduleMap.latestVersion}" var="latestVersion"/>
<c:set value="${moduleMap.previousVersions}" var="previousVersions"/>
<c:set value="${moduleMap.nextVersions}" var="nextVersions"/>
<c:url value='${url.base}${renderContext.site.path}/contents/modules-repository.createEntryFromJar.do' var="jarUploadPostUrl"/>
<c:if test="${isDeveloper && not viewAsUser}">
    <template:addResources type="inlinejavascript">
        <script type="text/javascript">
            function sendFileForModule(){
                //Get form pictures
                var fileFormData = new FormData();
                //Remove previews and put loading gif instead
                <c:url value='${url.currentModule}/img/loading.gif' var="loadingURL"/>
                $(".file-preview").empty();
                $(".file-preview").append('<img class="pull-center" src="${loadingURL}" style="margin-left:50%"/>');
                //Send pictures to server for node creation
                return true;
            }
            $(document).ready(function () {
                $('.publishVersion').click(function () {
                    var data = {};
                    data['published'] = $(this).attr("data-value");
                    data['jcrMethodToCall'] = 'put';
                    $.post($(this).attr("data-target"), data, function () {
                        window.location = '${fn:replace(currentNode.url,'.html','.changelog3.html')}';
                    }, "json");
                });
            });
        </script>
    </template:addResources>
</c:if>
<div class="container">
    <c:if test="${isDeveloper && not viewAsUser}">
        <div class="row">
            <div class="col-sm-12 versionUploadContainer">
                <h3><fmt:message key="jnt_forgeModule.uploadNewVersion"/></h3>
                <div id="jarUploadFormRow">
                    <template:tokenizedForm>
                        <form class="jarFile_upload" id="jar_file_upload_form_${currentNode.identifier}"
                              action="${jarUploadPostUrl}" method="POST" enctype="multipart/form-data" onsubmit="return sendFileForModule()">
                            <input id="jar_file_upload_${currentNode.identifier}" type="file" class="file" data-preview-file-type="text" name="file"/>
                            <input  type="hidden" name="redirectURL" value="${renderContext.mainResource.node.path}.changelog"/>
                        </form>
                    </template:tokenizedForm>
                </div>
            </div>
        </div>
    </c:if>
    <div class="row" id="moduleChangeLog">
        <div class="col-sm-12">
            <c:if test="${functions:length(nextVersions) > 0 && isDeveloper && not viewAsUser}">
                <div class="newVersions">
                    <c:forEach items="${nextVersions}" var="nextVersion" varStatus="status">
                        <c:if test="${status.first}">
                            <h2><fmt:message key="jnt_forgeEntry.label.newVersions"/></h2>
                            <c:set var="newVersionAvailable" value="true" />
                        </c:if>
                        <article class="previousVersion">
                            <template:module node="${nextVersion}" view="v3">
                                <template:param name="isLatestVersion" value="false"/>
                                <template:param name="isDeveloper" value="${isDeveloper}"/>
                                <template:param name="viewAsUser" value="${viewAsUser}"/>
                            </template:module>
                        </article>
                    </c:forEach>
                </div>
            </c:if>
        </div>
        <div class="col-sm-12">
            <c:if test="${empty latestVersion && isDeveloper && not viewAsUser}">
                <div class="alert alert-info">
                    <fmt:message key="jnt_forgeModule.label.developer.emptyChangeLog"/>
                </div>
            </c:if>
        </div>
        <div class="col-sm-12">
            <c:if test="${functions:length(previousVersions) > 0}">
                <div class="row previousVersions top-20">
                    <c:if test="${isDeveloper && not viewAsUser}">
                        <c:forEach items="${previousVersions}" var="previousVersion" varStatus="status">
                            <div class="col-sm-12">
                            <c:if test="${status.first}">
                                <h2><fmt:message key="jnt_forgeEntry.label.olderVersions"/></h2>
                            </c:if>
                            <div class="previousVersion">
                                <template:module node="${previousVersion}" view="v3">
                                    <template:param name="isDeveloper" value="${isDeveloper}"/>
                                    <template:param name="viewAsUser" value="${viewAsUser}"/>
                                </template:module>
                            </div>
                            </div>
                        </c:forEach>
                    </c:if>
                    <c:if test="${not isDeveloper or viewAsUser}">
                        <c:choose>
                            <c:when test="${not empty previousVersions}">
                                <c:forEach items="${previousVersions}" var="previousVersion" varStatus="status">
                                    <div class="col-sm-12">
                                        <c:if test="${previousVersion.properties['published'].boolean}">
                                            <c:set var="publishedPreviewVersionAvailable" value="true"/>
                                            <c:if test="${status.first}">
                                                <h2><fmt:message key="jnt_forgeEntry.label.previousVersions"/></h2>
                                            </c:if>
                                            <div class="previousVersion">
                                                <template:module node="${previousVersion}" view="v3">
                                                    <template:param name="isDeveloper" value="${isDeveloper}"/>
                                                    <template:param name="viewAsUser" value="${viewAsUser}"/>
                                                </template:module>
                                            </div>
                                        </c:if>
                                    </div>
                                </c:forEach>
                                <c:if test="${empty publishedPreviewVersionAvailable}">
                                    <div class="padding-x-10">
                                        <div class="alert alert-info">
                                            <fmt:message key="jnt_forgeModule.label.user.emptyPublishedChangeLog"/>
                                        </div>
                                    </div>
                                </c:if>
                            </c:when>
                            <c:otherwise>
                                <div class="padding-x-10">
                                    <div class="alert alert-info">
                                        <fmt:message key="jnt_forgeModule.label.user.emptyChangeLog"/>
                                    </div>
                                </div>
                            </c:otherwise>
                        </c:choose>
                    </c:if>
                </div>
            </c:if>
            <template:addCacheDependency flushOnPathMatchingRegexp="${currentNode.path}/.*"/>
        </div>
    </div>
</div>