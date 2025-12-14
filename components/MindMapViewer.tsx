import React, { useEffect, useRef, useState } from 'react';
import { X, Maximize2, Minimize2, Download, ChevronUp, ChevronDown, RotateCcw, FileCode } from 'lucide-react';

interface MindMapNode {
  name: string;
  color?: string;
  children?: MindMapNode[];
}

interface MindMapViewerProps {
  data: MindMapNode;
  fileName: string;
  onClose: () => void;
}

const MindMapViewer: React.FC<MindMapViewerProps> = ({ data, fileName, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const rootRef = useRef<any>(null);
  const updateRef = useRef<any>(null);
  const nodeGroupRef = useRef<any>(null);
  const zoomRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current || !window.d3) {
      setIsLoading(false);
      return;
    }

    const d3 = window.d3;
    const container = containerRef.current;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = { top: 20, right: 120, bottom: 20, left: 120 };
    const dx = 35;
    const dy = 220;
    const duration = 350;

    let i = 0;
    const root = d3.hierarchy(data);
    rootRef.current = root;

    root.descendants().forEach((d: any) => {
      if (d.data.color) {
        d.color = d.data.color;
      } else if (d.parent && d.parent.color) {
        d.color = d.parent.color;
      } else {
        d.color = '#95a5a6';
      }
    });

    const tree = d3.tree().nodeSize([dx, dy]);

    const zoom = d3.zoom()
      .scaleExtent([0.2, 4])
      .filter((event: any) => !event.ctrlKey && !event.button)
      .on('zoom', (event: any) => {
        g.attr('transform', event.transform);
      });

    zoomRef.current = zoom;
    svg.attr('width', width).attr('height', height).call(zoom as any);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${height / 2})`);
    const linkGroup = g.append('g').attr('fill', 'none').attr('stroke-width', 3);
    const nodeGroup = g.append('g');
    nodeGroupRef.current = nodeGroup;

    const initialTransform = d3.zoomIdentity.translate(margin.left, height / 2);
    svg.call(zoom.transform as any, initialTransform);

    root.x0 = 0;
    root.y0 = 0;

    if (root.children) {
      root.children.forEach((child: any) => {
        if (child.children) {
          child.children.forEach(collapse);
        }
      });
    }

    function collapse(d: any) {
      if (d.children) {
        d._children = d.children;
        d._children.forEach(collapse);
        d.children = null;
      }
    }

    function update(source: any) {
      tree(root);
      const nodes = root.descendants();
      const links = root.links();

      nodes.forEach((d: any) => { d.y = d.depth * dy; });

      const node = nodeGroup.selectAll('g.node')
        .data(nodes, (d: any) => d.id || (d.id = ++i));

      const nodeEnter = node.enter().append('g')
        .attr('class', 'node')
        .attr('transform', () => `translate(${source.y0},${source.x0})`)
        .on('click', (event: any, d: any) => {
          event.stopPropagation();
          if (d.children) {
            d._children = d.children;
            d.children = null;
          } else {
            d.children = d._children;
            d._children = null;
          }
          update(d);
        });

      nodeEnter.append('rect')
        .attr('class', 'node-rect')
        .attr('y', -14)
        .attr('height', 28)
        .attr('rx', 8)
        .attr('ry', 8)
        .style('fill', (d: any) => d.color)
        .style('opacity', 0)
        .style('cursor', 'pointer')
        .style('stroke', 'none');

      nodeEnter.each(function(d: any) {
        const textGroup = d3.select(this);
        const name = d.data.name;
        const codeMatch = name.match(/^([A-Z0-9\-]+):\s*(.+)$/);
        
        if (codeMatch) {
          const code = codeMatch[1] + ':';
          const content = codeMatch[2];
          
          const textElem = textGroup.append('text')
            .attr('dy', 0.35)
            .attr('x', 12);
          
          textElem.append('tspan')
            .attr('class', 'item-code')
            .style('font-weight', 700)
            .style('fill', '#ffd700')
            .style('font-size', '13px')
            .text(code);
          
          textElem.append('tspan')
            .text(' ' + content)
            .style('fill', 'white');
          
          textElem.style('fill-opacity', 0);
          d.bbox = (textElem.node() as any).getBBox();
        } else {
          const textElem = textGroup.append('text')
            .attr('dy', 0.35)
            .attr('x', 12)
            .text(name)
            .style('fill', 'white')
            .style('fill-opacity', 0);
          
          d.bbox = (textElem.node() as any).getBBox();
        }
      });

      const nodeUpdate = node.merge(nodeEnter as any).transition()
        .duration(duration)
        .attr('transform', (d: any) => `translate(${d.y},${d.x})`);

      nodeUpdate.select('rect')
        .attr('width', (d: any) => d.bbox.width + 24)
        .style('opacity', 1);

      nodeUpdate.select('text')
        .style('fill-opacity', 1);

      const nodeExit = node.exit().transition()
        .duration(duration)
        .attr('transform', () => `translate(${source.y},${source.x})`)
        .remove();

      nodeExit.select('rect').style('opacity', 0);
      nodeExit.select('text').style('fill-opacity', 0);

      const link = linkGroup.selectAll('path.link')
        .data(links, (d: any) => d.target.id);

      const linkEnter = link.enter().insert('path', 'g')
        .attr('class', 'link')
        .attr('stroke', (d: any) => d.target.color)
        .attr('stroke-opacity', 0.9)
        .attr('stroke-width', 3)
        .attr('fill', 'none')
        .attr('d', () => {
          const o = { x: source.x0, y: source.y0 };
          return diagonal(o, o);
        });

      link.merge(linkEnter as any).transition()
        .duration(duration)
        .attr('d', (d: any) => diagonal(d.source, d.target));

      link.exit().transition()
        .duration(duration)
        .attr('d', () => {
          const o = { x: source.x, y: source.y };
          return diagonal(o, o);
        })
        .remove();

      nodes.forEach((d: any) => {
        d.x0 = d.x;
        d.y0 = d.y;
      });

      function diagonal(s: any, d: any) {
        return `M ${s.y} ${s.x}
                C ${(s.y + d.y) / 2} ${s.x},
                  ${(s.y + d.y) / 2} ${d.x},
                  ${d.y} ${d.x}`;
      }
    }

    update(root);
    updateRef.current = update;
    setIsLoading(false);

    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      svg.attr('width', newWidth).attr('height', newHeight);
      g.attr('transform', `translate(${margin.left},${newHeight / 2})`);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [data]);

  const handleCollapseAll = () => {
    if (!rootRef.current || !updateRef.current) return;
    const collapse = (d: any) => {
      if (d.children) {
        d._children = d.children;
        d._children.forEach(collapse);
        d.children = null;
      }
    };
    rootRef.current.children?.forEach(collapse);
    updateRef.current(rootRef.current);
  };

  const handleExpandAll = () => {
    if (!rootRef.current || !updateRef.current) return;
    const expand = (d: any) => {
      if (d._children) {
        d.children = d._children;
        d._children = null;
        d.children.forEach(expand);
      }
    };
    rootRef.current.children?.forEach(expand);
    updateRef.current(rootRef.current);
  };

  const handleResetView = () => {
    if (!svgRef.current || !zoomRef.current || !window.d3) return;
    const d3 = window.d3;
    const svg = d3.select(svgRef.current);
    const height = containerRef.current?.clientHeight || 600;
    const initialTransform = d3.zoomIdentity.translate(120, height / 2);
    svg.transition().duration(750).call(
      zoomRef.current.transform,
      initialTransform
    );
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!nodeGroupRef.current || !rootRef.current) return;
    
    const search = term.toLowerCase();
    const highlightedNodes = new Set();
    
    if (search) {
      rootRef.current.descendants().forEach((d: any) => {
        const name = d.data.name.toLowerCase();
        if (name.includes(search)) {
          highlightedNodes.add(d.id);
          d.descendants?.().forEach((desc: any) => highlightedNodes.add(desc.id));
        }
      });
    }
    
    nodeGroupRef.current.selectAll('.node')
      .classed('highlighted', (d: any) => highlightedNodes.has(d.id))
      .classed('faded', (d: any) => search && !highlightedNodes.has(d.id));
  };

  const handleExportImage = async () => {
    if (!containerRef.current || !window.html2canvas) return;
    setIsExporting(true);
    try {
      const canvas = await window.html2canvas(containerRef.current, {
        backgroundColor: '#1e293b',
        scale: 3,
        logging: false,
        width: containerRef.current.scrollWidth,
        height: containerRef.current.scrollHeight
      });
      const link = document.createElement('a');
      link.download = `mindmap-${fileName.replace(/\.[^/.]+$/, '')}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportHTML = () => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fileName} - Mind Map</title>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <style>
    body { margin: 0; padding: 0; overflow: hidden; font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg, #0c1445 0%, #1a2a6c 50%, #2c3e50 100%); color: white; }
    #mindmap { width: 100vw; height: 100vh; }
    .node { cursor: pointer; pointer-events: all; }
    .node-rect { stroke: none; rx: 8; ry: 8; transition: all 0.3s ease; }
    .node-rect:hover { filter: brightness(1.2); }
    .node text { font: 12px 'Segoe UI', sans-serif; fill: white; text-anchor: start; dominant-baseline: central; pointer-events: none; font-weight: 500; text-shadow: 1px 1px 2px rgba(0,0,0,0.5); }
    .item-code { font-weight: 700; fill: #ffd700; font-size: 13px; text-shadow: 0 0 8px rgba(255, 215, 0, 0.6); }
    .link { fill: none; stroke-width: 3px; stroke-opacity: 0.9; }
    .node.faded { opacity: 0.15; }
    .node.highlighted .node-rect { filter: brightness(1.3) drop-shadow(0 0 8px rgba(255,255,255,0.5)); }
    .controls { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 10; }
    .search { width: 320px; padding: 10px 16px; font-size: 13px; border: 2px solid rgba(255,255,255,0.2); border-radius: 25px; background: rgba(0,0,0,0.7); color: white; outline: none; }
    .search:focus { border-color: #f39c12; }
    .info { position: absolute; top: 20px; left: 20px; background: rgba(0,0,0,0.8); padding: 12px; border-radius: 8px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="info">Click nodes to expand/collapse • Scroll to zoom • Drag to pan</div>
  <div class="controls"><input type="text" class="search" placeholder="Search..." oninput="search(this.value)"></div>
  <div id="mindmap"></div>
  <script>
    const data = ${JSON.stringify(data)};
    const margin = {top: 20, right: 120, bottom: 20, left: 120};
    const width = window.innerWidth, height = window.innerHeight;
    const dx = 35, dy = 220;
    let i = 0, root = d3.hierarchy(data);
    root.descendants().forEach(d => { d.color = d.data.color || (d.parent && d.parent.color) || '#95a5a6'; });
    const tree = d3.tree().nodeSize([dx, dy]);
    const zoom = d3.zoom().scaleExtent([0.2, 4]).on('zoom', e => g.attr('transform', e.transform));
    const svg = d3.select('#mindmap').append('svg').attr('width', width).attr('height', height).call(zoom);
    const g = svg.append('g').attr('transform', \`translate(\${margin.left},\${height/2})\`);
    const linkGroup = g.append('g'), nodeGroup = g.append('g');
    svg.call(zoom.transform, d3.zoomIdentity.translate(margin.left, height/2));
    root.x0 = 0; root.y0 = 0;
    if (root.children) root.children.forEach(c => { if (c.children) c.children.forEach(collapse); });
    function collapse(d) { if (d.children) { d._children = d.children; d._children.forEach(collapse); d.children = null; } }
    update(root);
    function update(source) {
      tree(root);
      const nodes = root.descendants(), links = root.links();
      nodes.forEach(d => { d.y = d.depth * dy; });
      const node = nodeGroup.selectAll('g.node').data(nodes, d => d.id || (d.id = ++i));
      const nodeEnter = node.enter().append('g').attr('class', 'node').attr('transform', \`translate(\${source.y0},\${source.x0})\`)
        .on('click', (e, d) => { e.stopPropagation(); if (d.children) { d._children = d.children; d.children = null; } else { d.children = d._children; d._children = null; } update(d); });
      nodeEnter.append('rect').attr('class', 'node-rect').attr('y', -14).attr('height', 28).attr('rx', 8).style('fill', d => d.color).style('opacity', 0);
      nodeEnter.each(function(d) {
        const name = d.data.name, match = name.match(/^([A-Z0-9\\-]+):\\s*(.+)$/);
        const text = d3.select(this).append('text').attr('dy', 0.35).attr('x', 12);
        if (match) { text.append('tspan').attr('class', 'item-code').text(match[1] + ':'); text.append('tspan').text(' ' + match[2]); }
        else text.text(name);
        text.style('fill-opacity', 0);
        d.bbox = text.node().getBBox();
      });
      node.merge(nodeEnter).transition().duration(350).attr('transform', d => \`translate(\${d.y},\${d.x})\`);
      nodeGroup.selectAll('rect').attr('width', d => d.bbox.width + 24).style('opacity', 1);
      nodeGroup.selectAll('text').style('fill-opacity', 1);
      node.exit().transition().duration(350).attr('transform', \`translate(\${source.y},\${source.x})\`).remove();
      const link = linkGroup.selectAll('path').data(links, d => d.target.id);
      link.enter().insert('path', 'g').attr('stroke', d => d.target.color).attr('stroke-width', 3).attr('fill', 'none')
        .attr('d', () => { const o = {x: source.x0, y: source.y0}; return \`M \${o.y} \${o.x} C \${o.y} \${o.x}, \${o.y} \${o.x}, \${o.y} \${o.x}\`; })
        .merge(link).transition().duration(350).attr('d', d => \`M \${d.source.y} \${d.source.x} C \${(d.source.y+d.target.y)/2} \${d.source.x}, \${(d.source.y+d.target.y)/2} \${d.target.x}, \${d.target.y} \${d.target.x}\`);
      link.exit().transition().duration(350).attr('d', () => { const o = {x: source.x, y: source.y}; return \`M \${o.y} \${o.x} C \${o.y} \${o.x}, \${o.y} \${o.x}, \${o.y} \${o.x}\`; }).remove();
      nodes.forEach(d => { d.x0 = d.x; d.y0 = d.y; });
    }
    function search(term) {
      const s = term.toLowerCase(), h = new Set();
      if (s) root.descendants().forEach(d => { if (d.data.name.toLowerCase().includes(s)) { h.add(d.id); d.descendants?.().forEach(x => h.add(x.id)); } });
      nodeGroup.selectAll('.node').classed('highlighted', d => h.has(d.id)).classed('faded', d => s && !h.has(d.id));
    }
  </script>
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const link = document.createElement('a');
    link.download = `mindmap-${fileName.replace(/\.[^/.]+$/, '')}-${Date.now()}.html`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className={`${isExpanded ? 'fixed inset-0 z-50' : 'relative h-full'} bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800`}>
      <style>{`
        .node { cursor: pointer; pointer-events: all; }
        .node-rect { transition: all 0.3s ease; }
        .node-rect:hover { filter: brightness(1.2); }
        .node text { font: 12px 'Segoe UI', sans-serif; fill: white; text-anchor: start; dominant-baseline: central; pointer-events: none; font-weight: 500; text-shadow: 1px 1px 2px rgba(0,0,0,0.5); }
        .item-code { font-weight: 700; fill: #ffd700; font-size: 13px; text-shadow: 0 0 8px rgba(255, 215, 0, 0.6); }
        .link { fill: none; stroke-opacity: 0.9; transition: all 0.3s ease; }
        .node.faded { opacity: 0.15; }
        .node.highlighted .node-rect { filter: brightness(1.3) drop-shadow(0 0 8px rgba(255,255,255,0.5)); }
      `}</style>

      <div className="absolute top-4 right-4 z-10 flex flex-col gap-3">
        <button onClick={handleCollapseAll} className="w-10 h-10 bg-slate-900/80 backdrop-blur-sm border-2 border-slate-700 hover:border-blue-500 text-slate-400 hover:text-blue-400 rounded-full transition-all flex items-center justify-center" title="Collapse All">
          <ChevronUp size={18} />
        </button>
        <button onClick={handleExpandAll} className="w-10 h-10 bg-slate-900/80 backdrop-blur-sm border-2 border-slate-700 hover:border-blue-500 text-slate-400 hover:text-blue-400 rounded-full transition-all flex items-center justify-center" title="Expand All">
          <ChevronDown size={18} />
        </button>
        <button onClick={handleResetView} className="w-10 h-10 bg-slate-900/80 backdrop-blur-sm border-2 border-slate-700 hover:border-orange-500 text-slate-400 hover:text-orange-400 rounded-full transition-all flex items-center justify-center" title="Reset View">
          <RotateCcw size={18} />
        </button>
        <button onClick={handleExportImage} disabled={isExporting || isLoading} className="w-10 h-10 bg-slate-900/80 backdrop-blur-sm border-2 border-slate-700 hover:border-green-500 text-slate-400 hover:text-green-400 rounded-full transition-all flex items-center justify-center disabled:opacity-50" title="Export as PNG">
          {isExporting ? <div className="w-4 h-4 border-2 border-slate-400 border-t-green-400 rounded-full animate-spin" /> : <Download size={18} />}
        </button>
        <button onClick={handleExportHTML} disabled={isLoading} className="w-10 h-10 bg-slate-900/80 backdrop-blur-sm border-2 border-slate-700 hover:border-purple-500 text-slate-400 hover:text-purple-400 rounded-full transition-all flex items-center justify-center disabled:opacity-50" title="Export as Interactive HTML">
          <FileCode size={18} />
        </button>
        <button onClick={() => setIsExpanded(!isExpanded)} className="w-10 h-10 bg-slate-900/80 backdrop-blur-sm border-2 border-slate-700 hover:border-white text-slate-400 hover:text-white rounded-full transition-all flex items-center justify-center" title={isExpanded ? "Exit Fullscreen" : "Fullscreen"}>
          {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
        <button onClick={onClose} className="w-10 h-10 bg-slate-900/80 backdrop-blur-sm border-2 border-slate-700 hover:border-red-500 text-slate-400 hover:text-red-400 rounded-full transition-all flex items-center justify-center" title="Close">
          <X size={18} />
        </button>
      </div>

      <div ref={containerRef} className="w-full h-full relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
              <span className="text-sm text-slate-400">Rendering mind map...</span>
            </div>
          </div>
        )}
        <svg ref={svgRef} className="w-full h-full" style={{ fontFamily: 'Segoe UI, sans-serif' }} />
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search items..."
          className="w-80 px-4 py-2 bg-slate-900/90 backdrop-blur-sm border-2 border-slate-700 rounded-full text-white text-sm placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
        />
      </div>
    </div>
  );
};

export default MindMapViewer;
