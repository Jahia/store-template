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
<%@include file="header.jspf"%>
<template:addResources type="javascript" resources="html5shiv.js, forge.js, bootstrap-editable.js"/>
<template:addResources type="javascript" resources="jquery.js,bootstrap-transition.js,bootstrap-alert.js,bootstrap-button.js
        ,bootstrap-carousel.js,bootstrap-collapse.js,bootstrap-dropdown.js,bootstrap-modal.js,bootstrap-tooltip.js,bootstrap-popover.js
        ,bootstrap-scrollspy.js,bootstrap-tab.js,bootstrap-typehead.js,bootstrap-affix.js"/>
<template:addResources type="javascript" resources="select2.js, bootstrap-editable.js, wysihtml5-0.3.0.js, bootstrap-wysihtml5.js, wysihtml5.js"/>
<template:addResources type="css" resources="select2.css, select2-bootstrap.css, bootstrap-editable.css,
        forge.edition.css, jquery.fileupload.css, bootstrap-wysihtml5.css"/>
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

<template:include view="hidden.sql">
    <template:param name="getLatestVersion" value="true"/>
    <template:param name="getPreviousVersions" value="true"/>
</template:include>
<c:set value="${moduleMap.latestVersion}" var="latestVersion"/>
<c:set value="${moduleMap.previousVersions}" var="previousVersions"/>
<c:set value="${moduleMap.nextVersions}" var="nextVersions"/>

<c:if test="${isDeveloper && not viewAsUser}">

    <template:addResources type="inlinejavascript">
        <script type="text/javascript">

            $(document).ready(function () {

                $('.publishVersion').click(function () {
                    var data = {};
                    data['published'] = $(this).attr("data-value");
                    data['jcrMethodToCall'] = 'put';

                    $.post($(this).attr("data-target"), data, function () {
                        window.location = '${fn:replace(currentNode.url,'.html','.changelog.html')}';
                    }, "json");
                });

            });
        </script>
    </template:addResources>
</c:if>

<article id="moduleChangeLog">

    <c:if test="${functions:length(nextVersions) > 0 && isDeveloper && not viewAsUser}">
        <section class="newVersions">
            <c:forEach items="${nextVersions}" var="nextVersion" varStatus="status">
                    <c:if test="${status.first}">
                        <h2><fmt:message key="jnt_forgeEntry.label.newVersions"/></h2>
                        <c:set var="newVersionAvailable" value="true" />
                    </c:if>
                    <article class="previousVersion">
                        <template:module node="${nextVersion}" view="v2">
                            <template:param name="isLatestVersion" value="false"/>
                            <template:param name="isDeveloper" value="${isDeveloper}"/>
                            <template:param name="viewAsUser" value="${viewAsUser}"/>
                        </template:module>
                    </article>
            </c:forEach>

        </section>
    </c:if>

    <c:choose>

        <c:when test="${not empty latestVersion}">
            <section class="whatsNew">
                <h2><fmt:message key="jnt_forgeEntry.label.version"/></h2>
                <template:module node="${latestVersion}" view="v2">
                    <template:param name="isDeveloper" value="${isDeveloper}"/>
                    <template:param name="viewAsUser" value="${viewAsUser}"/>
                </template:module>
            </section>

        </c:when>
        <c:otherwise>
            <c:if test="${isDeveloper && not viewAsUser}">
                <div class="alert alert-info">
                    <fmt:message key="jnt_forgeModule.label.developer.emptyChangeLog"/>
                </div>
            </c:if>

        </c:otherwise>

    </c:choose>

    <c:if test="${functions:length(previousVersions) > 0}">

        <section class="previousVersions">

            <c:if test="${isDeveloper && not viewAsUser}">
                <c:forEach items="${previousVersions}" var="previousVersion" varStatus="status">
                        <c:if test="${status.first}">
                            <h2><fmt:message key="jnt_forgeEntry.label.previousVersions"/></h2>
                        </c:if>
                        <article class="previousVersion">
                            <template:module node="${previousVersion}" view="v2">
                                <template:param name="isDeveloper" value="${isDeveloper}"/>
                                <template:param name="viewAsUser" value="${viewAsUser}"/>
                            </template:module>
                        </article>
                </c:forEach>
            </c:if>
            <c:if test="${not isDeveloper or viewAsUser}">
                <c:forEach items="${previousVersions}" var="previousVersion" varStatus="status">
                    <c:if test="${previousVersion.properties['published'].boolean}">
                        <c:if test="${status.first}">
                            <h2><fmt:message key="jnt_forgeEntry.label.previousVersions"/></h2>
                        </c:if>
                        <article class="previousVersion">
                            ${previousVersion.path}
                            <template:module node="${previousVersion}" view="v2">
                                <template:param name="isDeveloper" value="${isDeveloper}"/>
                                <template:param name="viewAsUser" value="${viewAsUser}"/>
                            </template:module>
                        </article>
                    </c:if>
                </c:forEach>
            </c:if>

        </section>

    </c:if>
    <template:addCacheDependency flushOnPathMatchingRegexp="${currentNode.path}/.*"/>
</article>