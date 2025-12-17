import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const { videoId } = await params;

    // Get authorization token from the request
    const authHeader = request.headers.get('authorization') ||
                      request.cookies.get('token')?.value;

    if (!authHeader) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    console.log("making video request")
    // Make request to protected video endpoint
    const videoResponse = await fetch(
      `http://localhost:8888/training-gif/${videoId}`,
      {
        headers: {
          'Authorization': authHeader.startsWith('Bearer ') ? authHeader.split(" ")[1] : authHeader,
          'Accept': '*/*'
        }
      }
    );

    if (!videoResponse.ok) {
      return new NextResponse('Video not found', { status: videoResponse.status });
    }

    // Get the video content and headers
    const videoBuffer = await videoResponse.arrayBuffer();
    const contentType = videoResponse.headers.get('content-type') || 'video/mp4';
    const contentLength = videoResponse.headers.get('content-length');

    // Create response with proper headers for video streaming
    const headers = new Headers({
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    });

    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    return new NextResponse(videoBuffer, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Error proxying video:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
