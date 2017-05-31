<%@ taglib prefix="functions" uri="http://www.jahia.org/tags/functions" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="jcr" uri="http://www.jahia.org/tags/jcr" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%@ taglib prefix="forge" uri="http://www.jahia.org/modules/forge/tags" %>
<%--@elvariable id="currentNode" type="org.jahia.services.content.JCRNodeWrapper"--%>
<%--@elvariable id="renderContext" type="org.jahia.services.render.RenderContext"--%>
<%-- Les styles--%>
<template:addCacheDependency flushOnPathMatchingRegexp="${renderContext.site.path}/contents/modules-repository/.*"/>
<template:addResources type="javascript" resources="storeUtils.js"/>
<template:include view="hidden.header"/>
<template:addResources type="inlinejavascript">
    <script type="text/javascript">
        //See storeFilter.v3 for usage
        var modulesStatus = {};
        var modulesTags = {};
        var modulesCategories = {};
        var tagCountMap = {};
    </script>
</template:addResources>
<%--Get pakcages--%>
<c:set var="statementPackages"
       value="SELECT module.* FROM [jnt:forgePackage] as module inner join [jnt:forgePackageVersion] as version on ischildnode(version,module)
                WHERE ISDESCENDANTNODE(module,'${renderContext.site.path}') AND module.[published]=true ORDER BY version.[jcr:created] DESC"/>
<jcr:sql var="packages" sql="${statementPackages}"/>

<%--Latest modules--%>
<c:set var="latestModules"
       value="SELECT module.* FROM [jnt:forgeModule] as module inner join [jnt:forgeModuleVersion] as version on ischildnode(version,module)
                WHERE ISDESCENDANTNODE(module,'${renderContext.site.path}') AND module.[published]=true ORDER BY version.[jcr:created] DESC"/>
<jcr:sql var="latest" sql="${latestModules}" limit="3"/>

<%--All modules--%>
<c:set var="allModules"
       value="SELECT * FROM [jnt:content]
                WHERE ISDESCENDANTNODE('${renderContext.site.path}') AND [published]=true
                AND ([jcr:primaryType] = 'jnt:forgeModule')
                ORDER BY [jcr:title] ASC"/>
<jcr:sql var="allmodules" sql="${allModules}"/>

<c:set var="latestModulesIds" value="" />
<div class="row">
    <div class="col-md-12">
        <ul class="filter-info list-inline"></ul>
    </div>
</div>
<div class="row filter-grid-container">
    <h4 style="color: #03a9f4;">JAHIA PACKAGES</h4>
    <div class="filter-grid">
        <c:set var="packagesNames" value=""/>
        <c:forEach items="${packages.nodes}" var="module" varStatus="status">
            <c:if test="${not fn:contains(packagesNames, module.identifier)}">
                <c:set var="packagesNames" value="${packagesNames},${module.identifier}"/>
                <!-- add status to status map -->
                <c:if test="${not empty module.properties['status'].string}">
                    <script type="text/javascript">
                        modulesStatus['${module.properties['status'].string}'] = "${module.properties['status'].string}".substring(0,1).toUpperCase() + "${module.properties['status'].string}".substring(1);
                    </script>
                </c:if>
                <!--Set module categories for filtering purposes-->
                <c:set var="categories" value=""/>
                <c:forEach items="${module.properties['j:defaultCategory']}" var="category" varStatus="categoryStatus" >
                    <c:set var='categories' value='${categories}${not categoryStatus.first ? " " : ""}${category.node.identifier}' />
                </c:forEach>
                <!--Set module tags for filtering purposes-->
                <c:set var="moduleTags" value=""/>
                <c:forEach items="${module.properties['j:tagList']}" var="moduleTag" varStatus="tagStatus">
                    <c:set var='moduleTags' value='${moduleTags}${not tagStatus.first ? " " : ""}${moduleTag.string}' />
                </c:forEach>
                <div class="grid-sizer col-lg-4 col-md-6 col-xs-12"></div>
                <div class="col-lg-4 col-md-6 col-xs-12"
                     data-filter-status="${module.properties['status'].string} all"
                     data-filter-categories="${categories} all"
                     data-filter-tags="${moduleTags}">
                    <div id="module-${module.identifier}">
                        <template:module node="${module}" view="v2"/>
                    </div>
                </div>
            </c:if>
        </c:forEach>
    </div>
</div>

<c:if test="${not empty latest.nodes}">
    <div class="row filter-grid-container">
        <h4 style="color: #03a9f4;">LATEST</h4>
        <div class="filter-grid">
            <c:forEach items="${latest.nodes}" var="module" varStatus="status">
                <c:if test="${module.properties['published'].boolean}">
                    <!-- add status to status map -->
                    <c:if test="${not empty module.properties['status'].string}">
                        <script type="text/javascript">
                            modulesStatus['${module.properties['status'].string}'] = "${module.properties['status'].string}".substring(0,1).toUpperCase() + "${module.properties['status'].string}".substring(1);
                        </script>
                    </c:if>
                    <!--Set module categories for filtering purposes-->
                    <c:set var="categories" value=""/>
                    <c:forEach items="${module.properties['j:defaultCategory']}" var="category" varStatus="categoryStatus" >
                        <c:set var='categories' value='${categories}${not categoryStatus.first ? " " : ""}${category.node.identifier}' />
                    </c:forEach>
                    <!--Set module tags for filtering purposes-->
                    <c:set var="moduleTags" value=""/>
                    <c:forEach items="${module.properties['j:tagList']}" var="moduleTag" varStatus="tagStatus">
                        <c:set var='moduleTags' value='${moduleTags}${not tagStatus.first ? " " : ""}${moduleTag.string}' />
                    </c:forEach>
                    <c:set var="latestModulesIds" value="${latestModulesIds},${module.identifier}" />
                    <div class="grid-sizer col-lg-4 col-md-6 col-xs-12"></div>
                    <div class="col-lg-4 col-md-6 col-xs-12"
                         data-filter-status="${module.properties['status'].string} all"
                         data-filter-categories="${categories} all"
                         data-filter-tags="${moduleTags}">
                        <div id="module-${module.identifier}">
                            <template:module node="${module}" view="v2"/>
                        </div>
                    </div>
                </c:if>
            </c:forEach>
        </div>
    </div>
</c:if>

<c:if test="${not empty allmodules.nodes}">
    <div class="row filter-grid-container">
        <h4 style="color: #03a9f4;">ALL MODULES</h4>
        <div class="filter-grid">
            <c:forEach items="${allmodules.nodes}" var="module" varStatus="status">
                <c:if test="${module.properties['published'].boolean and !fn:contains(latestModulesIds, module.identifier)}">
                    <!-- add status to status map -->
                    <c:if test="${not empty module.properties['status'].string}">
                        <script type="text/javascript">
                            modulesStatus['${module.properties['status'].string}'] = "${module.properties['status'].string}".substring(0,1).toUpperCase() + "${module.properties['status'].string}".substring(1);
                        </script>
                    </c:if>
                    <!--Set module categories for filtering purposes-->
                    <c:set var="categories" value=""/>
                    <c:forEach items="${module.properties['j:defaultCategory']}" var="category" varStatus="categoryStatus" >
                        <c:set var='categories' value='${categories}${not categoryStatus.first ? " " : ""}${category.node.identifier}' />
                    </c:forEach>
                    <!--Set module tags for filtering purposes-->
                    <c:set var="moduleTags" value=""/>
                    <c:forEach items="${module.properties['j:tagList']}" var="moduleTag" varStatus="tagStatus">
                        <c:set var='moduleTags' value='${moduleTags}${not tagStatus.first ? " " : ""}${moduleTag.string}' />
                    </c:forEach>
                    <div class="grid-sizer col-lg-4 col-md-6 col-xs-12"></div>
                    <div class="col-lg-4 col-md-6 col-xs-12"
                         data-filter-status="${module.properties['status'].string} all"
                         data-filter-categories="${categories} all"
                         data-filter-tags="${moduleTags}">
                        <div id="module-${module.identifier}">
                            <template:module node="${module}" view="v2"/>
                        </div>
                    </div>
                </c:if>
            </c:forEach>
        </div>
    </div>
</c:if>

<%--GET CATEGORIES AND TAGS FROM ALL MODULES--%>
<script type="text/javascript">
    //Tags and Categories for All packages
    <c:forEach items="${packages.nodes}" var="module" varStatus="status">
        <c:if test="${module.properties['published'].boolean}">
            <c:forEach items="${module.properties['j:defaultCategory']}" var="cat" varStatus="vs">
                <c:set var="categoryIdentifier" value="${cat.string}"/>
                <jcr:node var="category" uuid="${categoryIdentifier}"/>
            </c:forEach>
            modulesTags['${module.identifier}'] = [];
            <c:if test="${category != null}">
                modulesCategories['${category.properties['jcr:title'].string}'] = "${category.identifier}";
            </c:if>
            <c:forEach items="${module.properties['j:tagList']}" var="currentTag" varStatus="moduleStatus">
                modulesTags['${module.identifier}'].push('${currentTag.string}');
                tagCountMap['${currentTag.string}'] = tagCountMap['${currentTag.string}'] ? tagCountMap['${currentTag.string}'] + 1 : 1;
            </c:forEach>
        </c:if>
    </c:forEach>
    //Tags and Categories for All modules
    <c:forEach items="${allmodules.nodes}" var="module" varStatus="status">
        <c:if test="${module.properties['published'].boolean}">
            <c:forEach items="${module.properties['j:defaultCategory']}" var="cat" varStatus="vs">
                <c:set var="categoryIdentifier" value="${cat.string}"/>
                <jcr:node var="category" uuid="${categoryIdentifier}"/>
            </c:forEach>
            modulesTags['${module.identifier}'] = [];
            <c:if test="${category != null}">
                modulesCategories['${category.properties['jcr:title'].string}'] = "${category.identifier}";
            </c:if>
            <c:forEach items="${module.properties['j:tagList']}" var="currentTag" varStatus="moduleStatus">
                modulesTags['${module.identifier}'].push('${currentTag.string}');
                tagCountMap['${currentTag.string}'] = tagCountMap['${currentTag.string}'] ? tagCountMap['${currentTag.string}'] + 1 : 1;
            </c:forEach>
        </c:if>
    </c:forEach>
</script>