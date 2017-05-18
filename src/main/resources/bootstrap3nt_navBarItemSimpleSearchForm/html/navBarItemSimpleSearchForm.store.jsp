<%@ taglib prefix="functions" uri="http://www.jahia.org/tags/functions" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="jcr" uri="http://www.jahia.org/tags/jcr" %>
<%@ taglib prefix="s" uri="http://www.jahia.org/tags/search" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%--@elvariable id="currentNode" type="org.jahia.services.content.JCRNodeWrapper"--%>
<%--@elvariable id="renderContext" type="org.jahia.services.render.RenderContext"--%>

<script>
    $(document).ready(function () {
        $("#term-search").keyup(function(){
            $(".copy-term").val($(this).val());
        })
    });
</script>
<template:addResources type="css" resources="main.css"/>
<template:addCacheDependency uuid="${currentNode.properties.result.string}"/>
<c:if test="${not empty currentNode.properties.result.node}">
    <c:url value='${url.base}${currentNode.properties.result.node.path}.html' var="searchUrl"/>
    <s:form method="post" class="navbar-form navbar-search navbar-left" action="${searchUrl}" role="search" id="search">
        <div class="form-group">
            <div class="input-group">
                <span class="input-group-addon" id="basic-addon1"><i class="material-icons">search</i></span>
                <c:set var="searchPath" value="${renderContext.site.path}"/>
                <fmt:message key='bootstrap3nt_navBarSimpleSearchForm.label.search' var="placeholder"/>
                    <%--<s:term match="exact_phrase" id="searchTerm" searchIn="content"--%>
                    <%--class="form-control input-lg quicksearch search-query" placeholder="${placeholder}"/>--%>
                <s:pagePath value="${searchPath}" display="false" includeChildren="true"/>
                <s:site value="${renderContext.site.name}" includeReferencesFrom="systemsite" display="false"/>
                <s:language value="${renderContext.mainResource.locale}" display="false"/>
                <s:nodeType value="jmix:forgeElement"
                            selectionOptions="jmix:forgeElement,jnt:forgeModule,jnt:forgePackage" display="false"/>
                <s:nodeProperty nodeType="jnt:forgeModule" name="published" value="true" display="false"/>
                <s:nodeProperty nodeType="jnt:forgePackage" name="published" value="true" display="false"/>
                <input type="hidden" name="src_properties(jnt:forgeModule).description.value" value=""
                       class="copy-term"/>

                <input type="hidden" name="src_properties(jnt:forgeModule).description.match" value="all_words"/>

                <input type="hidden" name="src_properties(jnt:forgePackage).description.value" value=""
                       class="copy-term"/>

                <input type="hidden" name="src_properties(jnt:forgePackage).description.match" value="all_words"/>
                <input type="text" name="term" id="term-search" class="form-control input-lg quicksearch search-query"/>
            </div>
        </div>
    </s:form>
</c:if>