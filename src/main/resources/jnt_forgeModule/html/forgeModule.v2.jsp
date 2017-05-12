<%@ taglib prefix="jcr" uri="http://www.jahia.org/tags/jcr" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="utility" uri="http://www.jahia.org/tags/utilityLib" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
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
<c:set var="isAdminPage" value="${renderContext.mainResource.resolvedTemplate eq 'my-modules'}"/>
<c:set var="id" value="${currentNode.identifier}"/>
<c:set var="title" value="${currentNode.properties['jcr:title'].string}"/>
<jcr:node var="iconFolder" path="${currentNode.path}/icon" />
<c:forEach var="iconItem" items="${iconFolder.nodes}">
    <c:set var="icon" value="${iconItem}"/>
</c:forEach>
<c:set var="description" value="${currentNode.properties['description'].string}"/>

<%@include file="../../commons/authorName.jspf"%>

<c:url value="${currentNode.url}" context="/" var="moduleUrl"/>

<fmt:message key="jnt_forgeEntry.status.community" var="communityLabel"/>
<fmt:message key="jnt_forgeEntry.status.labs" var="labsLabel"/>
<fmt:message key="jnt_forgeEntry.status.prereleased" var="prereleasedLabel"/>
<fmt:message key="jnt_forgeEntry.status.supported" var="supportedLabel"/>
<c:set var="moduleStatus" value="${not empty currentNode.properties['status'].string?currentNode.properties['status'].string:'community'}"/>
<c:if test="${moduleStatus eq 'supported' or currentNode.properties['supportedByJahia'].boolean}">
    <c:set var="moduleStatus" value="supported"/>
</c:if>

<c:if test="${currentNode.properties['published'].boolean or isAdminPage}">
    <!-- Module Card -->
    <a href="${moduleUrl}">
        <div class="jps-moduleCard">
            <c:url var="iconUrl" value="${url.currentModule}/img/icon.png"/>
            <img class="moduleLogo noselect" src="${not empty icon.url ? icon.url : iconUrl}" alt="<fmt:message key="jnt_forgeEntry.label.moduleIcon"><fmt:param value="${title}"/></fmt:message>"/>
            <div class="card-topMain">
                <h1 class="truncate">${title}</h1>
                <author>${authorName}
                    <c:choose>
                        <c:when test="${moduleStatus eq 'supported'}">
                            <span class="module-supported">
                                <i class="material-icons noselect" title="${moduleStatus}">check_circle</i>
                            </span>
                        </c:when>
                    </c:choose>
                </author>
            </div>
            <p class="card-desc">${functions:abbreviate(functions:removeHtmlTags(description), 80,95,'...')}</p>
        </div>
    </a>
</c:if>
