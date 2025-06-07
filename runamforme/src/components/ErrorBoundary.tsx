import React, { type ErrorInfo } from 'react';
import { Alert, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private navigate: ReturnType<typeof useNavigate>;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
    // Note: This is a workaround since hooks can't be used in classes
    // In a real app, consider making this a functional component with hooks
    this.navigate = () => { window.location.href = '/'; };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
    // Here you could also log to an error tracking service
    // logErrorToService(error, errorInfo);
  }

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    this.navigate('/');
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div 
          className="d-flex flex-column min-vh-100 justify-content-center align-items-center p-3"
          role="alert"
          aria-live="assertive"
        >
          <Alert 
            variant="danger" 
            className="text-center w-100"
            style={{ maxWidth: '600px' }}
          >
            <Alert.Heading className="h4">
              <span role="img" aria-label="Warning">⚠️</span> Something went wrong
            </Alert.Heading>
            <p className="mb-3">
              We're sorry - the application has encountered an unexpected error.
            </p>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="mb-3 text-start">
                <summary>Error details</summary>
                <pre className="p-2 bg-light rounded overflow-auto">
                  {this.state.error?.toString()}
                  <br />
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="d-flex flex-column flex-sm-row gap-2 justify-content-center">
              <Button 
                variant="primary" 
                onClick={this.handleRefresh}
                aria-label="Refresh the page"
                className="flex-grow-1"
              >
                Refresh Page
              </Button>
              <Button 
                variant="outline-primary" 
                onClick={this.handleGoHome}
                aria-label="Go to home page"
                className="flex-grow-1"
              >
                Go to Home
              </Button>
            </div>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;