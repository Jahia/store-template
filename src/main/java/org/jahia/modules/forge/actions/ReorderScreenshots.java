/**
 * ==========================================================================================
 * =                            JAHIA'S ENTERPRISE DISTRIBUTION                             =
 * ==========================================================================================
 *
 *                                  http://www.jahia.com
 *
 * JAHIA'S ENTERPRISE DISTRIBUTIONS LICENSING - IMPORTANT INFORMATION
 * ==========================================================================================
 *
 *     Copyright (C) 2002-2017 Jahia Solutions Group. All rights reserved.
 *
 *     This file is part of a Jahia's Enterprise Distribution.
 *
 *     Jahia's Enterprise Distributions must be used in accordance with the terms
 *     contained in the Jahia Solutions Group Terms & Conditions as well as
 *     the Jahia Sustainable Enterprise License (JSEL).
 *
 *     For questions regarding licensing, support, production usage...
 *     please contact our team at sales@jahia.com or go to http://www.jahia.com/license.
 *
 * ==========================================================================================
 */
package org.jahia.modules.forge.actions;

import antlr.StringUtils;
import org.jahia.bin.Action;
import org.jahia.bin.ActionResult;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRSessionWrapper;
import org.jahia.services.render.RenderContext;
import org.jahia.services.render.Resource;
import org.jahia.services.render.URLResolver;
import org.slf4j.Logger;

import javax.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;


/**
 * Date: 2013-05-17
 *
 * @author Frédéric PIERRE
 * @version 1.0
 */
public class ReorderScreenshots extends Action {

    private transient static Logger logger = org.slf4j.LoggerFactory.getLogger(ReorderScreenshots.class);

    @Override
    public ActionResult doExecute(HttpServletRequest req, RenderContext renderContext, Resource resource, JCRSessionWrapper session, Map<String, List<String>> parameters, URLResolver urlResolver) throws Exception {

        List<String> orderedIds = parameters.get("nodes[]");
        JCRNodeWrapper screenshots = resource.getNode();
        if(screenshots.isNodeType("jnt:forgeScreenshotsList")) {
            for (String orderedId : orderedIds) {
                screenshots.orderBefore(org.apache.commons.lang.StringUtils.substringAfterLast(session.getNodeByIdentifier(orderedId).getPath(),"/"),null);
            }
            session.save();
        } else {
            return ActionResult.INTERNAL_ERROR_JSON;
        }
        return ActionResult.OK_JSON;
    }
}