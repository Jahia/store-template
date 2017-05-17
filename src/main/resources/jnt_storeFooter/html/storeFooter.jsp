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

<template:addResources type="inlinejavascript">
    <script type="text/javascript">
        $(document).ready(function(){
            var footer = $('.footer-2');
            $(document).on('updateFooterPosition', function() {
               //Hide footer so it does not interfere with calculation.
               footer.hide();
               var coords = footer.offset();
               coords.top = $(document).height();
               footer.offset(coords);
               footer.show();
           });
        });
    </script>
</template:addResources>

<div class="footer-2">
    <div class="container">
        <div class="row">
            <div class="col-md-6">
                <p>Copyrights © 2002-2017&nbsp;All Rights Reserved by Jahia Solutions Group SA</p>
                <div class="clear"></div>
            </div>
            <div class="col-md-6">
                <p class="pull-right text-right"><a class="iubenda-nostyle iubenda-embed" href="https://www.iubenda.com/privacy-policy/816082" title="Privacy Policy" target="_blank">Privacy Policy</a> /
                    <a href="https://www.jahia.com/terms-of-use-jahia" title="Terms of Use">Terms of Use</a> / <a href="https://www.jahia.com/cookies" title="Cookies">Cookies</a><br>
                    <a href="https://www.facebook.com/JahiaSolutions" title="Facebook" target="_blank"><span class="fa-stack fa-lg"> <i class="fa fa-circle fa-stack-2x"></i> <i class="fa fa-facebook fa-stack-1x fa-inverse"></i> </span> </a> <a href="https://www.linkedin.com/company/jahia-solutions" title="LinkedIn" target="_blank"> <span class="fa-stack fa-lg"> <i class="fa fa-circle fa-stack-2x"></i> <i class="fa fa-linkedin fa-stack-1x fa-inverse"></i> </span> </a> <a class="social-icon si-small si-light si-twitter" href="https://twitter.com/Jahia" target="_blank" title="Twitter"> <span class="fa-stack fa-lg"> <i class="fa fa-circle fa-stack-2x"></i> <i class="fa fa-twitter fa-stack-1x fa-inverse"></i> </span> </a> <a class="social-icon si-small si-light si-youtube" href="http://www.youtube.com/jahiacms" target="_blank" title="YouTube"> <span class="fa-stack fa-lg"> <i class="fa fa-circle fa-stack-2x"></i> <i class="fa fa-youtube fa-stack-1x fa-inverse"></i> </span> </a>
                </p>
                <div class="clear"></div>
            </div>
        </div>
    </div>
</div>