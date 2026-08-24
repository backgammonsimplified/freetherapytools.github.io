(function (global) {
  "use strict";

  const d3 = global.TherapyGraphD3;
  if (!d3 || typeof document === "undefined") return;

  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

  function createForceViewport(options) {
    const container = options.container;
    const svgElement = container?.querySelector("svg");
    if (!container || !svgElement) return null;
    const controlsRoot = container.closest("[data-force-graph-root]") || container;

    const reducedMotion = options.reducedMotion ?? global.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    const svg = d3.select(svgElement);
    const scene = svg.select("[data-force-scene]");
    const linkLayer = scene.select("[data-force-links]");
    const nodeLayer = scene.select("[data-force-nodes]");
    const status = container.querySelector("[data-force-status]");
    const minZoom = Number(options.minZoom) || 0.45;
    const maxZoom = Number(options.maxZoom) || 3.2;
    let width = 640;
    let height = 560;
    let nodes = [];
    let links = [];
    let nodeSelection = nodeLayer.selectAll("g");
    let linkSelection = linkLayer.selectAll("line");
    let destroyed = false;
    let initialCameraApplied = false;
    let transformFrame = 0;

    const linkForce = d3.forceLink([])
      .id((node) => node.id)
      .distance((link) => options.linkDistance?.(link) ?? 160)
      .strength((link) => options.linkStrength?.(link) ?? 0.5);
    const simulation = d3.forceSimulation([])
      .alphaDecay(reducedMotion ? 0.35 : (options.alphaDecay ?? 0.055))
      .velocityDecay(options.velocityDecay ?? 0.52)
      .force("link", linkForce)
      .force("charge", d3.forceManyBody().strength((node) => options.charge?.(node) ?? -180).distanceMax(620))
      .force("collision", d3.forceCollide().radius((node) => (options.collisionRadius?.(node) ?? 34) + 5).strength(0.9).iterations(2))
      .force("x", d3.forceX(0).strength((node) => node.type === "center" ? 0.16 : 0.018))
      .force("y", d3.forceY(0).strength((node) => node.type === "center" ? 0.16 : 0.018))
      .on("tick", draw);

    const zoomBehavior = d3.zoom()
      .scaleExtent([minZoom, maxZoom])
      .filter((event) => !event.target.closest?.("[data-force-node]") && (!event.ctrlKey || event.type === "wheel"))
      .on("zoom", (event) => scene.attr("transform", event.transform));
    svg.call(zoomBehavior).on("dblclick.zoom", null);

    function dimensions() {
      const rect = container.querySelector("[data-force-canvas]")?.getBoundingClientRect() || container.getBoundingClientRect();
      width = Math.max(280, Math.round(rect.width || 640));
      height = Math.max(360, Math.round(rect.height || 560));
      svg.attr("viewBox", `0 0 ${width} ${height}`);
    }

    function draw() {
      if (destroyed) return;
      linkSelection
        .attr("x1", (link) => link.source.x)
        .attr("y1", (link) => link.source.y)
        .attr("x2", (link) => link.target.x)
        .attr("y2", (link) => link.target.y);
      nodeSelection.attr("transform", (node) => `translate(${node.x || 0} ${node.y || 0})`);
      options.onTick?.(nodes, links);
    }

    function graphBounds(subset = nodes) {
      if (!subset.length) return { minX: -1, maxX: 1, minY: -1, maxY: 1 };
      return subset.reduce((bounds, node) => {
        const radius = options.collisionRadius?.(node) ?? 34;
        bounds.minX = Math.min(bounds.minX, (node.x || 0) - radius);
        bounds.maxX = Math.max(bounds.maxX, (node.x || 0) + radius);
        bounds.minY = Math.min(bounds.minY, (node.y || 0) - radius);
        bounds.maxY = Math.max(bounds.maxY, (node.y || 0) + radius);
        return bounds;
      }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
    }

    function targetTransform(subset, padding = 54, maximumScale = 1.65) {
      const bounds = graphBounds(subset);
      const graphWidth = Math.max(1, bounds.maxX - bounds.minX);
      const graphHeight = Math.max(1, bounds.maxY - bounds.minY);
      const scale = clamp(Math.min((width - padding * 2) / graphWidth, (height - padding * 2) / graphHeight), minZoom, Math.min(maxZoom, maximumScale));
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      return d3.zoomIdentity.translate(width / 2 - centerX * scale, height / 2 - centerY * scale).scale(scale);
    }

    function applyTransform(target, animate = true) {
      global.cancelAnimationFrame?.(transformFrame);
      if (reducedMotion || !animate) {
        svg.call(zoomBehavior.transform, target);
        return;
      }
      const start = svgElement.__zoom || d3.zoomIdentity;
      const started = performance.now();
      const duration = 260;
      const step = (now) => {
        const progress = clamp((now - started) / duration, 0, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const next = d3.zoomIdentity
          .translate(start.x + (target.x - start.x) * eased, start.y + (target.y - start.y) * eased)
          .scale(start.k + (target.k - start.k) * eased);
        svg.call(zoomBehavior.transform, next);
        if (progress < 1) transformFrame = global.requestAnimationFrame(step);
      };
      transformFrame = global.requestAnimationFrame(step);
    }

    function fitVisible(animate = true) {
      applyTransform(targetTransform(nodes, width < 480 ? 20 : 52, 1.55), animate);
      container.dataset.lastCameraAction = "fit";
      if (status) status.textContent = "Fitted the view to all visible graph nodes.";
    }

    function resetView(animate = true, announce = true) {
      const initialIds = new Set(options.initialNodeIds || []);
      const initialNodes = nodes.filter((node) => initialIds.has(node.id));
      applyTransform(targetTransform(initialNodes.length ? initialNodes : nodes, width < 480 ? 18 : 48, 1.75), animate);
      container.dataset.lastCameraAction = "reset";
      if (status && announce) status.textContent = "Reset the camera to You and the life domains. Expanded Values remain open.";
    }

    function ensureVisible(ids) {
      const wanted = new Set(ids || []);
      const subset = nodes.filter((node) => wanted.has(node.id));
      if (!subset.length) return;
      const transform = svgElement.__zoom || d3.zoomIdentity;
      const bounds = graphBounds(subset);
      const margin = 34;
      const left = bounds.minX * transform.k + transform.x;
      const right = bounds.maxX * transform.k + transform.x;
      const top = bounds.minY * transform.k + transform.y;
      const bottom = bounds.maxY * transform.k + transform.y;
      let dx = 0;
      let dy = 0;
      if (left < margin) dx = margin - left;
      else if (right > width - margin) dx = width - margin - right;
      if (top < margin) dy = margin - top;
      else if (bottom > height - margin) dy = height - margin - bottom;
      if (dx || dy) applyTransform(d3.zoomIdentity.translate(transform.x + dx, transform.y + dy).scale(transform.k), true);
    }

    const dragBehavior = d3.drag()
      .clickDistance(5)
      .filter((event, node) => options.draggable?.(node) !== false)
      .on("start", (event, node) => {
        event.sourceEvent?.stopPropagation?.();
        if (!event.active && !reducedMotion) simulation.alphaTarget(0.08).restart();
        node.fx = node.x;
        node.fy = node.y;
        container.dataset.dragState = "reheated";
      })
      .on("drag", (event, node) => {
        node.fx = event.x;
        node.fy = event.y;
      })
      .on("end", (event, node) => {
        if (!event.active) simulation.alphaTarget(0);
        node.fx = null;
        node.fy = null;
        container.dataset.dragState = "released";
        if (reducedMotion) {
          simulation.stop();
          for (let index = 0; index < 24; index += 1) simulation.tick();
          draw();
        } else simulation.alpha(0.28).restart();
      });

    function bindToolbar() {
      controlsRoot.querySelectorAll("[data-graph-action]").forEach((button) => button.addEventListener("click", () => {
        const action = button.dataset.graphAction;
        if (action === "fit") fitVisible();
        else if (action === "reset") resetView();
        else if (action === "zoom-in") svg.call(zoomBehavior.scaleBy, 1.25);
        else if (action === "zoom-out") svg.call(zoomBehavior.scaleBy, 0.8);
      }));
    }

    function update(nextNodes, nextLinks, updateOptions = {}) {
      const previous = new Map(nodes.map((node) => [node.id, node]));
      nodes = nextNodes.map((node) => {
        const old = previous.get(node.id);
        return old ? { ...node, x: old.x, y: old.y, vx: old.vx, vy: old.vy } : { ...node };
      });
      links = nextLinks.map((link) => ({ ...link, source: typeof link.source === "object" ? link.source.id : link.source, target: typeof link.target === "object" ? link.target.id : link.target }));

      linkSelection = linkLayer.selectAll("line")
        .data(links, (link) => link.id)
        .join(
          (enter) => enter.append("line").attr("class", (link) => `therapy-force-link therapy-force-link-${link.type || "default"}`),
          (current) => current,
          (exit) => exit.remove()
        );
      nodeSelection = nodeLayer.selectAll("g")
        .data(nodes, (node) => node.id)
        .join(
          (enter) => enter.append("g").attr("data-force-node", "").each(function (node) { options.renderNode?.(this, node); }),
          (current) => current,
          (exit) => exit.remove()
        )
        .attr("class", (node) => `therapy-force-node therapy-force-node-${node.type}`)
        .attr("role", (node) => node.type === "domain" ? "button" : "img")
        .attr("tabindex", "0")
        .attr("aria-label", (node) => options.ariaLabel?.(node) || node.label || node.id)
        .attr("aria-expanded", (node) => node.type === "domain" ? String(Boolean(node.expanded)) : null)
        .each(function (node) { options.updateNode?.(this, node); })
        .on("click", (event, node) => {
          if (!event.defaultPrevented) options.onNodeActivate?.(node, event);
        })
        .on("keydown", (event, node) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          options.onNodeActivate?.(node, event);
        })
        .call(dragBehavior);

      simulation.nodes(nodes);
      linkForce.links(links);
      simulation.alpha(reducedMotion ? 0.7 : (updateOptions.reheat ?? 0.52));
      if (reducedMotion) {
        simulation.stop();
        for (let index = 0; index < 140; index += 1) simulation.tick();
        draw();
        container.dataset.motionMode = "reduced-settled";
      } else {
        simulation.alphaTarget(0).restart();
        container.dataset.motionMode = "animated-settle";
      }

      if (!initialCameraApplied) {
        if (!reducedMotion) {
          simulation.stop();
          for (let index = 0; index < 60; index += 1) simulation.tick();
          draw();
          simulation.alpha(0.32).restart();
        }
        resetView(false, false);
        initialCameraApplied = true;
      } else if (updateOptions.newNodeIds?.length) {
        global.setTimeout(() => ensureVisible(updateOptions.newNodeIds), reducedMotion ? 0 : 420);
      }
      return nodes;
    }

    function destroy() {
      destroyed = true;
      simulation.stop();
      resizeObserver?.disconnect();
      global.cancelAnimationFrame?.(transformFrame);
      svg.on(".zoom", null);
    }

    dimensions();
    bindToolbar();
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => dimensions()) : null;
    resizeObserver?.observe(container.querySelector("[data-force-canvas]") || container);

    const api = { update, fitVisible, resetView, ensureVisible, destroy, simulation, getNodes: () => nodes, getLinks: () => links };
    container.__forceGraph = api;
    container.dataset.panZoom = "initialized";
    return api;
  }

  global.TherapyForceGraph = { createForceViewport };
}(typeof window !== "undefined" ? window : globalThis));
