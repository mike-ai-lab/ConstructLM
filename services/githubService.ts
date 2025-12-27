// GitHub Integration Service
// Provides repository browsing, file fetching, and code analysis capabilities

export interface GitHubRepo {
  owner: string;
  name: string;
  branch: string;
  url: string;
}

export interface GitHubFile {
  path: string;
  name: string;
  type: 'file' | 'dir';
  size?: number;
  url: string;
  downloadUrl?: string;
}

export interface GitHubContent {
  path: string;
  content: string;
  size: number;
}

class GitHubService {
  private baseUrl = 'https://api.github.com';
  
  // Parse GitHub URL to extract repo info
  parseGitHubUrl(url: string): GitHubRepo | null {
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+))?/,
      /github\.com\/([^\/]+)\/([^\/]+)(?:\/blob\/([^\/]+))?/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          name: match[2].replace(/\.git$/, ''),
          branch: match[3] || 'main',
          url: `https://github.com/${match[1]}/${match[2]}`
        };
      }
    }
    return null;
  }

  // Fetch repository tree structure
  async fetchRepoTree(repo: GitHubRepo, path: string = ''): Promise<GitHubFile[]> {
    try {
      const url = `${this.baseUrl}/repos/${repo.owner}/${repo.name}/contents/${path}?ref=${repo.branch}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          // Try 'master' branch if 'main' fails
          if (repo.branch === 'main') {
            repo.branch = 'master';
            return this.fetchRepoTree(repo, path);
          }
        }
        throw new Error(`GitHub API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (Array.isArray(data)) {
        return data.map((item: any) => ({
          path: item.path,
          name: item.name,
          type: item.type === 'dir' ? 'dir' : 'file',
          size: item.size,
          url: item.html_url,
          downloadUrl: item.download_url
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Failed to fetch repo tree:', error);
      throw error;
    }
  }

  // Fetch file content
  async fetchFileContent(downloadUrl: string): Promise<string> {
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error(`Failed to fetch file: ${response.status}`);
      return await response.text();
    } catch (error) {
      console.error('Failed to fetch file content:', error);
      throw error;
    }
  }

  // Fetch multiple files
  async fetchMultipleFiles(files: GitHubFile[]): Promise<GitHubContent[]> {
    const contents: GitHubContent[] = [];
    
    for (const file of files) {
      if (file.type === 'file' && file.downloadUrl) {
        try {
          const content = await this.fetchFileContent(file.downloadUrl);
          contents.push({
            path: file.path,
            content,
            size: file.size || 0
          });
        } catch (error) {
          console.error(`Failed to fetch ${file.path}:`, error);
        }
      }
    }
    
    return contents;
  }

  // Fetch README
  async fetchReadme(repo: GitHubRepo): Promise<string | null> {
    const readmeNames = ['README.md', 'README.MD', 'readme.md', 'README', 'README.txt'];
    
    for (const name of readmeNames) {
      try {
        const url = `https://raw.githubusercontent.com/${repo.owner}/${repo.name}/${repo.branch}/${name}`;
        const response = await fetch(url);
        if (response.ok) {
          return await response.text();
        }
      } catch (error) {
        continue;
      }
    }
    
    return null;
  }

  // Get repository info
  async fetchRepoInfo(repo: GitHubRepo): Promise<any> {
    try {
      const url = `${this.baseUrl}/repos/${repo.owner}/${repo.name}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch repo info: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch repo info:', error);
      return null;
    }
  }

  // Search code in repository
  async searchCode(repo: GitHubRepo, query: string): Promise<GitHubFile[]> {
    try {
      const url = `${this.baseUrl}/search/code?q=${encodeURIComponent(query)}+repo:${repo.owner}/${repo.name}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Search failed: ${response.status}`);
      
      const data = await response.json();
      return data.items.map((item: any) => ({
        path: item.path,
        name: item.name,
        type: 'file',
        url: item.html_url,
        downloadUrl: `https://raw.githubusercontent.com/${repo.owner}/${repo.name}/${repo.branch}/${item.path}`
      }));
    } catch (error) {
      console.error('Code search failed:', error);
      return [];
    }
  }

  // Get branches
  async fetchBranches(repo: GitHubRepo): Promise<string[]> {
    try {
      const url = `${this.baseUrl}/repos/${repo.owner}/${repo.name}/branches`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch branches: ${response.status}`);
      
      const data = await response.json();
      return data.map((branch: any) => branch.name);
    } catch (error) {
      console.error('Failed to fetch branches:', error);
      return ['main', 'master'];
    }
  }

  // Smart file selection for analysis (get important files)
  async getImportantFiles(repo: GitHubRepo): Promise<GitHubFile[]> {
    const importantPatterns = [
      'README.md',
      'package.json',
      'requirements.txt',
      'setup.py',
      'Cargo.toml',
      'go.mod',
      'pom.xml',
      'build.gradle',
      'tsconfig.json',
      'webpack.config.js',
      'vite.config.ts',
      '.env.example',
      'docker-compose.yml',
      'Dockerfile'
    ];
    
    try {
      const files = await this.fetchRepoTree(repo);
      return files.filter(f => 
        f.type === 'file' && 
        importantPatterns.some(pattern => f.name.toLowerCase().includes(pattern.toLowerCase()))
      );
    } catch (error) {
      console.error('Failed to get important files:', error);
      return [];
    }
  }
}

export const githubService = new GitHubService();
