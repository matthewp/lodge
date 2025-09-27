class AdminAPI {
  private baseURL = '/admin-api';

  async login(username: string, password: string): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      if (data.token) {
        localStorage.setItem('lodge_token', data.token);
      }

      return { success: true, token: data.token };
    } catch (error) {
      return { success: false, error: 'Failed to connect to server' };
    }
  }

  async logout(): Promise<void> {
    localStorage.removeItem('lodge_token');
    try {
      await fetch(`${this.baseURL}/logout`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
    } catch {
      // Ignore logout errors
    }
  }

  async getCurrentUser(): Promise<{ username: string; role: string } | null> {
    try {
      const response = await fetch(`${this.baseURL}/me`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch {
      return null;
    }
  }

  // Collections Management
  async getCollections(): Promise<Array<{ id: number; name: string; slug: string; description: string; createdAt: string; updatedAt: string }>> {
    const response = await fetch(`${this.baseURL}/collections`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch collections');
    }

    return await response.json();
  }

  async createCollection(collection: { name: string; slug: string; description?: string }): Promise<{ id: number; name: string; slug: string; description: string; createdAt: string; updatedAt: string }> {
    const response = await fetch(`${this.baseURL}/collections`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(collection),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create collection');
    }

    return await response.json();
  }

  async updateCollection(id: number, collection: { name?: string; slug?: string; description?: string }): Promise<void> {
    const response = await fetch(`${this.baseURL}/collections/${id}`, {
      method: 'PUT',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(collection),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update collection');
    }
  }

  async deleteCollection(id: number): Promise<void> {
    const response = await fetch(`${this.baseURL}/collections/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete collection');
    }
  }

  // Collection Fields Management
  async getCollectionFields(collectionId: number): Promise<Array<{ id: number; name: string; label: string; type: string; required: boolean; placeholder: string; defaultValue: string; sortOrder: number }>> {
    const response = await fetch(`${this.baseURL}/collections/${collectionId}/fields`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch collection fields');
    }

    return await response.json();
  }

  async createCollectionField(collectionId: number, field: { name: string; label: string; type: string; required?: boolean; placeholder?: string; defaultValue?: string; sortOrder?: number }): Promise<{ id: number; name: string; label: string; type: string; required: boolean; placeholder: string; defaultValue: string; sortOrder: number }> {
    const response = await fetch(`${this.baseURL}/collections/${collectionId}/fields`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(field),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create field');
    }

    return await response.json();
  }

  // API Keys Management
  async getAPIKeys(): Promise<Array<{ id: number; name: string; keyPrefix: string; createdAt: string; lastUsedAt?: string; isActive: boolean }>> {
    const response = await fetch(`${this.baseURL}/api-keys`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch API keys');
    }

    return await response.json();
  }

  async createAPIKey(name: string): Promise<{ key: string; message: string }> {
    const response = await fetch(`${this.baseURL}/api-keys`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create API key');
    }

    return await response.json();
  }

  async deleteAPIKey(id: number): Promise<void> {
    const response = await fetch(`${this.baseURL}/api-keys?id=${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete API key');
    }
  }

  // Items Management
  async getCollectionItems(collectionId: number): Promise<Array<{ id: number; collectionId: number; slug?: string; data: Record<string, any>; status: string; createdAt: string; updatedAt: string }>> {
    const response = await fetch(`${this.baseURL}/items/collection/${collectionId}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch items');
    }

    return await response.json();
  }

  async createItem(collectionId: number, item: { slug?: string; data: Record<string, any>; status?: string }): Promise<{ id: number; collectionId: number; slug?: string; data: Record<string, any>; status: string; createdAt: string; updatedAt: string }> {
    const response = await fetch(`${this.baseURL}/items/collection/${collectionId}`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slug: item.slug || '',
        data: item.data,
        status: item.status || 'draft',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create item');
    }

    return await response.json();
  }

  async updateItem(itemId: number, item: { slug?: string; data: Record<string, any>; status?: string }): Promise<{ id: number; collectionId: number; slug?: string; data: Record<string, any>; status: string; createdAt: string; updatedAt: string }> {
    const response = await fetch(`${this.baseURL}/items/${itemId}`, {
      method: 'PUT',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slug: item.slug || '',
        data: item.data,
        status: item.status || 'draft',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update item');
    }

    return await response.json();
  }

  async deleteItem(itemId: number): Promise<void> {
    const response = await fetch(`${this.baseURL}/items/${itemId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete item');
    }
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('lodge_token');
    if (token) {
      return {
        'Authorization': `Bearer ${token}`,
      };
    }
    return {};
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('lodge_token');
  }
}

export const adminAPI = new AdminAPI();