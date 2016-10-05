<%@ taglib prefix="functions" uri="http://www.jahia.org/tags/functions" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="jcr" uri="http://www.jahia.org/tags/jcr" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%--@elvariable id="currentNode" type="org.jahia.services.content.JCRNodeWrapper"--%>
<%--@elvariable id="renderContext" type="org.jahia.services.render.RenderContext"--%>
<c:set var="isHomePage" value="${renderContext.mainResource.node.identifier eq renderContext.site.home.identifier}"/>
<c:set var="isSearchResultPage" value="${(renderContext.mainResource.node.primaryNodeType.name eq 'jnt:page') and (renderContext.mainResource.node.name eq 'search-results')}"/>

<c:set value="${renderContext.site.properties['j:title'].string}" var="title"/>
<jcr:nodeProperty node="${currentNode}" name="j:styleName" var="styleName"/>
<jcr:nodeProperty node="${currentNode}" name="option" var="option"/>
<jcr:nodeProperty node="${currentNode}" name="inverse" var="inverse"/>
<c:choose>
    <c:when test="${renderContext.editModeConfigName eq 'studiomode'}">
        <ul>
            <c:forEach items="${jcr:getChildrenOfType(currentNode, 'bootstrap3mix:navBarItem')}" var="child"
                       varStatus="status">
                <template:module node="${child}"/>
            </c:forEach>
            <template:module path="*"/>
        </ul>
    </c:when>
    <c:otherwise>
        <c:set var="navbarClasses" value=" "/>
        <c:if test="${not empty option and not empty option.string}">
            <c:set var="navbarClasses" value="${navbarClasses} ${option.string}"/>
        </c:if>
        <c:if test="${not empty inverse and inverse.boolean}">
            <c:set var="navbarClasses" value="${navbarClasses} navbar-inverse"/>
        </c:if>
        <c:if test="${not empty styleName}">
            <c:set var="navbarClasses" value="${navbarClasses} ${styleName.string}"/>
        </c:if>

        <nav class="${navbarClasses}" <c:if test="${!(isHomePage or isSearchResultPage)}">class="affix"</c:if>>
            <c:if test="${!(isHomePage or isSearchResultPage)}">
                <ul class="nav nav-pills pull-left">
                    <li>
                        <a class="back-link" href="${renderContext.site.home.url}">
                            <img src="<c:url value='${url.currentModule}/img/ic_arrow_back_white_36px.svg'/>">
                            <span class="page-title">${renderContext.site.displayableName}</span>
                        </a>
                    </li>
                </ul>
            </c:if>

            <ul class="nav nav-pills pull-right">
                <c:forEach items="${jcr:getChildrenOfType(currentNode, 'bootstrap3mix:navBarItem')}" var="child"
                           varStatus="status">
                    <template:module node="${child}"/>
                </c:forEach>
            </ul>
        </nav>
        <h3 class="text-muted"><c:if test="${not empty title}">${title}</c:if></h3>
    </c:otherwise>
</c:choose>