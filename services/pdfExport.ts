import { Todo } from '../types';

export const exportTodosToPDF = (todos: Todo[]) => {
  const win = window as any;
  const jsPDF = win.jspdf?.jsPDF || win.jsPDF || win.window?.jsPDF;

  if (!jsPDF) {
    alert('PDF library failed to load');
    return;
  }

  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true, orientation: 'portrait' });
  
  // Sanitize text - remove special Unicode characters and normalize
  const sanitize = (text: string): string => {
    return (text || '')
      .trim()
      .replace(/[\u2000-\uFFFF]/g, '') // Remove all Unicode special characters
      .replace(/[^\x20-\x7E\n]/g, '') // Keep only ASCII printable + newline
      .replace(/\s+/g, ' '); // Normalize whitespace
  };
  
  // Safe text wrapping that doesn't corrupt characters
  const wrapText = (text: string, maxWidth: number): string[] => {
    const cleanText = sanitize(text);
    if (!cleanText) return [];
    try {
      return doc.splitTextToSize(cleanText, maxWidth);
    } catch (e) {
      // Fallback: manual wrapping
      const words = cleanText.split(' ');
      const lines: string[] = [];
      let currentLine = '';
      words.forEach(word => {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        if (doc.getTextWidth(testLine) > maxWidth) {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });
      if (currentLine) lines.push(currentLine);
      return lines;
    }
  };

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const colWidth = (contentWidth - 4) / 2;

  let yPos = margin;
  let pageNum = 1;

  // Colors - Enhanced palette
  const colors = {
    primary: { bg: [8, 35, 70], text: [255, 255, 255] },
    accent: [17, 94, 189],
    accentLight: [59, 130, 246],
    high: [239, 68, 68],
    medium: [245, 127, 23],
    low: [34, 197, 94],
    border: [219, 234, 254],
    lightBg: [241, 245, 250],
    darkText: [15, 23, 42],
    grayText: [100, 116, 139],
    lightGray: [243, 244, 246],
    priorityBar: [59, 130, 246],
  };

  const addPageBreak = () => {
    addPageFooter();
    doc.addPage();
    pageNum++;
    yPos = margin;
  };

  const addPageFooter = () => {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.grayText[0], colors.grayText[1], colors.grayText[2]);
    doc.text('© ConstructLM Task Manager', margin, pageHeight - 8);
    doc.text(`Page ${pageNum}`, pageWidth - margin - 10, pageHeight - 8, { align: 'right' });
    
    doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
  };

  const checkPageBreak = (needed: number) => {
    if (yPos + needed > pageHeight - 15) {
      addPageBreak();
      return true;
    }
    return false;
  };

  // ===== PROFESSIONAL HEADER =====
  const headerHeight = 45;
  doc.setFillColor(colors.primary.bg[0], colors.primary.bg[1], colors.primary.bg[2]);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');

  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.primary.text[0], colors.primary.text[1], colors.primary.text[2]);
  doc.text('TASK MANAGEMENT REPORT', margin, 18);

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${dateStr} at ${timeStr}`, margin, 28);
  doc.text(`Total Items: ${todos.length}`, margin, 34);

  yPos = headerHeight + 8;

  // ===== STATISTICS CARDS =====
  const completed = todos.filter(t => t.completed && !t.archived).length;
  const active = todos.filter(t => !t.completed && !t.archived).length;
  const archived = todos.filter(t => t.archived).length;
  const completionRate = active + completed > 0 ? Math.round((completed / (active + completed)) * 100) : 0;
  const highPriority = todos.filter(t => t.priority === 'high' && !t.completed && !t.archived).length;
  const overdue = todos.filter(t => t.dueDate && new Date(t.dueDate).getTime() < Date.now() && !t.completed && !t.archived).length;

  const statsCards = [
    { label: 'Active Tasks', value: active, color: colors.accent },
    { label: 'Completed', value: completed, color: colors.low },
    { label: 'Completion', value: `${completionRate}%`, color: colors.medium },
  ];

  const cardWidth = (contentWidth - 4) / 3;
  let cardX = margin;
  
  statsCards.forEach((stat) => {
    const cardHeight = 24;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cardX, yPos, cardWidth, cardHeight, 2, 2, 'F');
    doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(cardX, yPos, cardWidth, cardHeight, 2, 2, 'S');

    // Top accent bar
    doc.setFillColor(stat.color[0], stat.color[1], stat.color[2]);
    doc.rect(cardX, yPos, cardWidth, 2, 'F');

    // Label
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.grayText[0], colors.grayText[1], colors.grayText[2]);
    doc.text(stat.label, cardX + cardWidth / 2, yPos + 6, { align: 'center' });

    // Value
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(stat.color[0], stat.color[1], stat.color[2]);
    doc.text(String(stat.value), cardX + cardWidth / 2, yPos + 16, { align: 'center' });

    cardX += cardWidth + 2;
  });

  yPos += 28;

  // ===== DETAILED TASKS SECTION =====
  const taskCategories = [
    { title: 'HIGH PRIORITY TASKS', filter: (t: Todo) => t.priority === 'high' && !t.completed && !t.archived, icon: '⚠' },
    { title: 'ACTIVE TASKS', filter: (t: Todo) => t.priority !== 'high' && !t.completed && !t.archived, icon: '○' },
    { title: 'COMPLETED TASKS', filter: (t: Todo) => t.completed && !t.archived, icon: '✓' },
    { title: 'ARCHIVED TASKS', filter: (t: Todo) => t.archived, icon: '○' },
  ];

  taskCategories.forEach(category => {
    const categoryTasks = todos.filter(category.filter);
    if (categoryTasks.length === 0) return;

    // Add spacing before section header
    yPos += 6;
    checkPageBreak(14);

    // Section Header
    doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
    doc.rect(margin, yPos, contentWidth, 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`${category.title} (${categoryTasks.length})`, margin + 3, yPos + 5);
    yPos += 12;

    categoryTasks.forEach((todo, taskIdx) => {
      // Calculate dynamic height based on content - conservative estimate
      const titleLines = wrapText(todo.title || 'Untitled', contentWidth - 10).length;
      const notesLines = todo.notes ? wrapText(todo.notes, contentWidth - 12).length : 0;
      
      // Calculate actual lines needed for subtasks (considering wrapping)
      let subtaskLinesTotal = 0;
      if (todo.subtasks && todo.subtasks.length > 0) {
        todo.subtasks.forEach((st: any) => {
          const checkmark = st.completed ? '[x] ' : '[ ] ';
          const subtaskTitle = sanitize(st.title || 'Unnamed');
          const subtaskText = checkmark + subtaskTitle;
          const subtaskWrapped = wrapText(subtaskText, contentWidth - 14);
          subtaskLinesTotal += subtaskWrapped.length;
        });
      }
      
      // Conservative height calculation with padding
      const titleHeight = titleLines * 4;
      const metadataHeight = 8; // Priority, Category, Status + Due, Est
      const tagsHeight = todo.tags && todo.tags.length > 0 ? (wrapText('Tags: ' + sanitize(todo.tags.join(', ')), contentWidth - 10).length * 3.5) + 1 : 0;
      const notesHeight = notesLines > 0 ? notesLines * 3.5 + 6 : 0;
      const subtasksHeight = subtaskLinesTotal > 0 ? subtaskLinesTotal * 3.5 + 5 : 0;
      const dynamicHeight = Math.max(36, 10 + titleHeight + metadataHeight + tagsHeight + notesHeight + subtasksHeight);

      checkPageBreak(dynamicHeight + 2);

      // Task Card Background with shadow effect
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, yPos, contentWidth, dynamicHeight, 2, 2, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.6);
      doc.roundedRect(margin, yPos, contentWidth, dynamicHeight, 2, 2, 'S');

      // Priority Bar (left side, thicker)
      const priorityColorMap: any = { high: colors.high, medium: colors.medium, low: colors.low };
      const priorityColor = priorityColorMap[todo.priority || 'low'] || colors.low;
      const priorityLabel = (todo.priority || 'low').toUpperCase();
      doc.setFillColor(priorityColor[0], priorityColor[1], priorityColor[2]);
      doc.rect(margin, yPos, 5, dynamicHeight, 'F');

      const contentX = margin + 8;
      const contentY = yPos + 5;
      let currentY = contentY;
      const maxContentY = yPos + dynamicHeight - 4;

      // Task Number/ID Badge (if available)
      if (taskIdx !== undefined) {
        const badgeSize = 5.5;
        doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
        doc.roundedRect(contentX - 1, currentY - 3, badgeSize, badgeSize, 1, 1, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(String(taskIdx + 1), contentX + 1.75, currentY + 0.5, { align: 'center' });
      }

      // Main Title Row (clean, no symbols)
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(colors.darkText[0], colors.darkText[1], colors.darkText[2]);
      
      const titleText = sanitize(todo.title || 'Untitled');
      const titleWrapped = wrapText(titleText, contentWidth - 18);
      
      let titleY = currentY;
      titleWrapped.slice(0, 2).forEach((line: string) => {
        doc.text(sanitize(line), contentX + 6, titleY);
        titleY += 4.5;
      });
      currentY = titleY + 1;

      // Horizontal divider line
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.setLineWidth(0.3);
      doc.line(contentX, currentY, contentX + contentWidth - 12, currentY);
      currentY += 2.5;

      // Upper section: Key Information in compact format
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(colors.grayText[0], colors.grayText[1], colors.grayText[2]);

      // Build single-line metadata
      const metaInfo: string[] = [];
      metaInfo.push(priorityLabel);
      if (todo.category) metaInfo.push(sanitize(todo.category));
      if (todo.estimatedTime) metaInfo.push(todo.estimatedTime + 'min');

      if (todo.dueDate) {
        const dueDate = new Date(todo.dueDate);
        const isOverdue = dueDate.getTime() < Date.now() && !todo.completed;
        const dueStr = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        metaInfo.push('Due: ' + dueStr + (isOverdue ? ' OVERDUE' : ''));
      }
      
      const statusLabel = todo.completed ? 'COMPLETED' : todo.archived ? 'ARCHIVED' : 'ACTIVE';
      metaInfo.push(statusLabel);

      const metaLine = metaInfo.join(' | ');
      const metaWrapped = wrapText(metaLine, contentWidth - 14);
      metaWrapped.slice(0, 2).forEach((line: string, idx: number) => {
        if (currentY < maxContentY - 8) {
          doc.text(sanitize(line), contentX, currentY);
          currentY += 3.2;
        }
      });
      currentY += 1;

      // Tags section - simplified badges
      if (todo.tags && todo.tags.length > 0 && currentY < maxContentY - 10) {
        const tagsList = todo.tags.slice(0, 4); // Limit to 4 tags
        let tagX = contentX;
        const tagMaxX = contentX + contentWidth - 14;
        let tagsAdded = 0;
        
        tagsList.forEach((tag: string, idx: number) => {
          const tagText = sanitize(tag).slice(0, 12);
          const tagWidth = doc.getTextWidth(tagText) + 4.5;
          
          if (tagX + tagWidth > tagMaxX && idx > 0) {
            const remaining = tagsList.length - idx;
            if (remaining > 0) {
              doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
              doc.roundedRect(tagX, currentY - 2.5, 8, 4, 1, 1, 'F');
              doc.setFontSize(6);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(colors.grayText[0], colors.grayText[1], colors.grayText[2]);
              doc.text('+' + remaining, tagX + 4, currentY + 0.3, { align: 'center' });
            }
            return;
          }
          
          doc.setFillColor(colors.accentLight[0], colors.accentLight[1], colors.accentLight[2]);
          doc.roundedRect(tagX, currentY - 2.5, tagWidth, 4, 1, 1, 'F');
          doc.setFontSize(6);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(255, 255, 255);
          doc.text(tagText, tagX + tagWidth / 2, currentY + 0.3, { align: 'center' });
          tagX += tagWidth + 1.5;
          tagsAdded++;
        });
        currentY += 4.5;
      }

      // Notes section - compact
      if (todo.notes && currentY < maxContentY - 12) {
        doc.setFillColor(colors.lightBg[0], colors.lightBg[1], colors.lightBg[2]);
        const availableHeight = maxContentY - currentY - 8;
        const notesBoxHeight = Math.min(availableHeight, 12);
        doc.roundedRect(contentX - 1, currentY - 0.5, contentWidth - 12, notesBoxHeight, 1, 1, 'F');
        
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(colors.darkText[0], colors.darkText[1], colors.darkText[2]);
        
        const notesWrapped = wrapText(todo.notes, contentWidth - 18);
        let notesY = currentY + 2;
        notesWrapped.slice(0, 2).forEach((line: string) => {
          if (notesY < currentY + notesBoxHeight - 1.5) {
            doc.text(sanitize(line), contentX + 2, notesY);
            notesY += 3;
          }
        });
        if (notesWrapped.length > 2) {
          doc.setFontSize(6);
          doc.setTextColor(colors.grayText[0], colors.grayText[1], colors.grayText[2]);
          doc.text('...', contentX + 2, notesY);
        }
        currentY += notesBoxHeight + 1;
      }

      // Subtasks Progress Bar and List - compact
      if (todo.subtasks && todo.subtasks.length > 0 && currentY < maxContentY - 4) {
        const completedCount = todo.subtasks.filter((s: any) => s.completed).length;
        const progressPercent = (completedCount / todo.subtasks.length) * 100;
        
        // Progress bar background
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(contentX - 1, currentY, contentWidth - 12, 3, 1, 1, 'F');
        
        // Progress bar fill with accent color
        if (progressPercent > 0) {
          doc.setFillColor(colors.accentLight[0], colors.accentLight[1], colors.accentLight[2]);
          doc.roundedRect(contentX - 1, currentY, (contentWidth - 12) * (progressPercent / 100), 3, 1, 1, 'F');
        }
        
        currentY += 5;
        
        // Progress text - moved below the bar
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(colors.darkText[0], colors.darkText[1], colors.darkText[2]);
        doc.text(completedCount + '/' + todo.subtasks.length + ' completed', contentX + 1, currentY);
        currentY += 4;

        // Subtask items - compact
        let subtaskCount = 0;
        for (const st of todo.subtasks) {
          if (currentY > maxContentY - 2) {
            const remaining = todo.subtasks.length - subtaskCount;
            if (remaining > 0) {
              doc.setFontSize(6);
              doc.setTextColor(colors.accent[0], colors.accent[1], colors.accent[2]);
              doc.text(remaining + ' more', contentX, currentY);
            }
            break;
          }

          const checkmark = st.completed ? 'x' : ' ';
          const subtaskTitle = sanitize(st.title || 'Unnamed').slice(0, 35);
          
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(st.completed ? colors.grayText[0] : colors.darkText[0], st.completed ? colors.grayText[1] : colors.darkText[1], st.completed ? colors.grayText[2] : colors.darkText[2]);
          
          doc.text('[' + checkmark + ']', contentX, currentY);
          doc.text(subtaskTitle, contentX + 5.5, currentY);
          currentY += 3;
          subtaskCount++;
        }
      }

      yPos += dynamicHeight + 4;
    });

    yPos += 2;
  });

  addPageFooter();
  doc.save(`ConstructLM-Tasks-${now.toISOString().split('T')[0]}.pdf`);
};
